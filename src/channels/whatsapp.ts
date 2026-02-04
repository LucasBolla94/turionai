import {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeWASocket,
  useMultiFileAuthState,
  type WASocket,
} from "baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode";
import pino from "pino";
import { resolve } from "node:path";

const authDir = resolve("state", "baileys");

export async function initWhatsApp(): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "info" }),
    getMessage: async () => undefined,
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const qrText = await qrcode.toString(qr, { type: "terminal" });
      console.log(qrText);
      console.log("[Turion] escaneie o QR Code acima com o WhatsApp.");
    }

    if (connection === "open") {
      console.log("[Turion] WhatsApp conectado.");
    }

    if (connection === "close") {
      const error = lastDisconnect?.error as Boom | undefined;
      const statusCode = error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.warn("[Turion] WhatsApp desconectado.", {
        statusCode,
        shouldReconnect,
      });

      if (shouldReconnect) {
        await initWhatsApp();
      } else {
        console.warn("[Turion] Sessão encerrada. Remova state/baileys e reconecte.");
      }
    }
  });

  socket.ev.on("messages.upsert", (event) => {
    for (const message of event.messages) {
      const from = message.key.remoteJid ?? "unknown";
      const text =
        message.message?.conversation ??
        message.message?.extendedTextMessage?.text ??
        "";
      console.log(`[Turion] msg de ${from}: ${text}`);
    }
  });

  return socket;
}
