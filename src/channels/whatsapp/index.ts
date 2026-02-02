import makeWASocket, {
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  getContentType
} from "@whiskeysockets/baileys";
import makeInMemoryStore from "@whiskeysockets/baileys";
import pino from "pino";
import type { Router } from "../../core/router.js";

export async function startWhatsAppChannel(
  router: Router,
  authDir: string,
  authNumbers: string[]
): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();
  const store = makeInMemoryStore({ logger: pino({ level: "silent" }) });

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: "silent" })
  });

  store.bind(sock.ev);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const reason = (lastDisconnect?.error as { message?: string })?.message ?? "unknown";
      console.log(`WhatsApp connection closed: ${reason}`);
    }
    if (connection === "open") {
      console.log("WhatsApp connected.");
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

      const response = await router.handleMessage({
        text,
        user,
        channel: "whatsapp"
      });

      await sock.sendMessage(jid, { text: response.text });
    }
  });

  console.log("WhatsApp channel ready. Scan the QR code if prompted.");
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
  const text = "Turion conectado com sucesso. Tudo pronto para usar.";
  for (const number of authNumbers) {
    const jid = `${number}@s.whatsapp.net`;
    try {
      await sock.sendMessage(jid, { text });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      console.log(`Falha ao notificar ${number}: ${message}`);
    }
  }
}
