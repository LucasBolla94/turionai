import makeWASocket, {
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  getContentType,
  DisconnectReason
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import type { Router } from "../../core/router.js";
import fs from "node:fs";

const QR_REFRESH_MS = 60_000;
const RECONNECT_MS = 3_000;
const NOISY_LOG_PATTERNS = [
  /Closing open session/i,
  /Closing session: SessionEntry/i,
  /Decrypted message with closed session/i,
  /Failed to decrypt message with any known session/i,
  /Bad MAC/i
];
const notifiedNumbers = new Set<string>();

export async function startWhatsAppChannel(
  router: Router,
  authDir: string,
  authNumbers: string[]
): Promise<void> {
  await runSocket(router, authDir, authNumbers);
}

async function runSocket(
  router: Router,
  authDir: string,
  authNumbers: string[]
): Promise<void> {
  const restoreConsole = installLogFilter(NOISY_LOG_PATTERNS);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" })
  });

  let lastQrAt = 0;
  let connected = false;
  let restartScheduled = false;
  let qrTimer: NodeJS.Timeout | null = null;
  let syncReady = false;

  const scheduleRestart = (reason: string) => {
    if (restartScheduled) return;
    restartScheduled = true;
    console.log(`WhatsApp: ${reason}. Reiniciando conexao...`);
    setTimeout(() => {
      try {
        sock.ws?.close();
      } catch {
        // ignore
      }
      runSocket(router, authDir, authNumbers).catch((err) => {
        console.log(`Falha ao reiniciar WhatsApp: ${String(err)}`);
      });
    }, RECONNECT_MS);
  };

  const scheduleQrRefresh = () => {
    if (qrTimer) clearInterval(qrTimer);
    qrTimer = setInterval(() => {
      if (connected) return;
      if (!lastQrAt) return;
      const age = Date.now() - lastQrAt;
      if (age > QR_REFRESH_MS) {
        console.log("QR expirou. Gerando um novo QR...");
        scheduleRestart("QR expirado");
      }
    }, 5_000);
  };

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      lastQrAt = Date.now();
      console.log("QR Code para conexao WhatsApp (escaneie com o celular):");
      qrcode.generate(qr, { small: true });
      scheduleQrRefresh();
    }

    if (connection === "open") {
      connected = true;
      if (qrTimer) {
        clearInterval(qrTimer);
        qrTimer = null;
      }
      console.log("WhatsApp conectado.");
      if (syncReady) {
        await notifyAuthorizedUsers(sock, authNumbers);
      }
    }

    if (connection === "close") {
      connected = false;
      syncReady = false;
      const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output
        ?.statusCode;
      if (statusCode === DisconnectReason.loggedOut) {
        console.log("WhatsApp desconectado pelo telefone. Gerando novo QR...");
        resetAuth(authDir);
        scheduleRestart("Sessao encerrada");
        return;
      }
      scheduleRestart("Conexao perdida");
    }
  });

  sock.ev.on("messaging-history.set", async () => {
    syncReady = true;
    console.log("WhatsApp sincronizado.");
    if (connected) {
      await notifyAuthorizedUsers(sock, authNumbers);
    }
  });

  sock.ev.on("messages.upsert", async (msg) => {
    if (msg.type !== "notify") return;
    for (const message of msg.messages) {
      if (!message.message || message.key.fromMe) continue;
      const jid = message.key.remoteJid;
      if (!jid) continue;
      const user = jid.split("@")[0];
      const text = extractText(message.message);
      if (!text) continue;

      await sock.sendMessage(jid, { text: "Turion escutando." });

      const response = await router.handleMessage({
        text,
        user,
        channel: "whatsapp"
      });

      await sock.sendMessage(jid, { text: response.text });
    }
  });

  console.log("WhatsApp pronto. Se aparecer QR, escaneie com o celular.");
  sock.ev.on("connection.update", (update) => {
    if (update.connection === "open") {
      restoreConsole();
    }
  });
}

function extractText(message: unknown): string | null {
  const type = getContentType(message as Record<string, unknown>);
  if (!type) return null;
  const content = (message as Record<string, unknown>)[type] as unknown;
  if (!content) return null;

  if (type === "conversation" && typeof content === "string") {
    return content;
  }
  if (type === "extendedTextMessage") {
    const text = (content as { text?: unknown }).text;
    return typeof text === "string" ? text : null;
  }
  if (type === "imageMessage" || type === "videoMessage") {
    const caption = (content as { caption?: unknown }).caption;
    return typeof caption === "string" ? caption : null;
  }

  return null;
}

async function notifyAuthorizedUsers(
  sock: ReturnType<typeof makeWASocket>,
  authNumbers: string[]
): Promise<void> {
  for (const number of authNumbers) {
    if (notifiedNumbers.has(number)) continue;
    const jid = `${number}@s.whatsapp.net`;
    const text = `Eiii ${number}, estamos quase la !!`;
    try {
      await sock.sendMessage(jid, { text });
      notifiedNumbers.add(number);
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      console.log(`Falha ao notificar ${number}: ${message}`);
    }
  }
}

function resetAuth(authDir: string): void {
  try {
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
      fs.mkdirSync(authDir, { recursive: true });
    } else {
      fs.mkdirSync(authDir, { recursive: true });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.log(`Falha ao limpar sessao do WhatsApp: ${message}`);
  }
}

function installLogFilter(patterns: RegExp[]): () => void {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalStdout = process.stdout.write.bind(process.stdout);
  const originalStderr = process.stderr.write.bind(process.stderr);

  const shouldSuppress = (msg: string): boolean => patterns.some((p) => p.test(msg));

  const filter = (fn: (...args: unknown[]) => void) => (...args: unknown[]) => {
    const text = args.map((a) => String(a)).join(" ");
    if (shouldSuppress(text)) return;
    fn(...args);
  };

  console.log = filter(originalLog);
  console.warn = filter(originalWarn);
  console.error = filter(originalError);

  const filterWrite =
    (writeFn: (chunk: any, encoding?: any, cb?: any) => boolean) =>
    (chunk: any, encoding?: any, cb?: any) => {
      const text = typeof chunk === "string" ? chunk : chunk?.toString?.() ?? "";
      if (shouldSuppress(text)) return true;
      return writeFn(chunk, encoding, cb);
    };

  process.stdout.write = filterWrite(originalStdout) as typeof process.stdout.write;
  process.stderr.write = filterWrite(originalStderr) as typeof process.stderr.write;

  return () => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
  };
}
