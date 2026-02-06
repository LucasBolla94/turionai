/**
 * WhatsApp Adapter - V1.1.1 STEP-01
 * Adapter for Baileys WhatsApp library
 */

import { MessageAdapter, NormalizedMessage } from "../types";
import { WASocket } from "baileys";

export class WhatsAppAdapter implements MessageAdapter {
  name = "whatsapp";

  constructor(private socket: WASocket) {}

  /**
   * Normaliza mensagem do Baileys para formato padrão
   * @param rawMessage - Mensagem no formato Baileys
   * @returns Mensagem normalizada
   */
  normalize(rawMessage: any): NormalizedMessage {
    // Extrair informações da mensagem Baileys
    const from = rawMessage.key.remoteJid ?? "unknown";
    const sender = rawMessage.key.participant ?? rawMessage.key.remoteJid ?? "unknown";

    // Extrair texto (suporta diferentes tipos de mensagem)
    const text =
      rawMessage.message?.conversation ??
      rawMessage.message?.extendedTextMessage?.text ??
      rawMessage.message?.imageMessage?.caption ??
      rawMessage.message?.videoMessage?.caption ??
      "";

    // Gerar thread ID (remove caracteres especiais)
    const threadId = from.replace(/[^\w]/g, "_");

    return {
      id: rawMessage.key.id || `msg_${Date.now()}`,
      text: text.trim(),
      from,
      userId: sender,
      threadId,
      channel: "whatsapp",
      timestamp: rawMessage.messageTimestamp
        ? Number(rawMessage.messageTimestamp) * 1000
        : Date.now(),
      metadata: {
        key: rawMessage.key,
        pushName: rawMessage.pushName,
        messageType: this.getMessageType(rawMessage.message),
        isGroup: from.endsWith("@g.us"),
      },
    };
  }

  /**
   * Envia mensagem via WhatsApp
   * @param to - JID do destinatário
   * @param message - Texto da mensagem
   */
  async send(to: string, message: string): Promise<void> {
    try {
      await this.socket.sendMessage(to, { text: message });
    } catch (error) {
      console.error("[WhatsAppAdapter] Erro ao enviar mensagem:", error);
      throw error;
    }
  }

  /**
   * Detecta tipo de mensagem
   * @param message - Objeto de mensagem Baileys
   * @returns Tipo da mensagem
   */
  private getMessageType(message: any): string {
    if (!message) return "unknown";

    if (message.conversation) return "text";
    if (message.extendedTextMessage) return "extended_text";
    if (message.imageMessage) return "image";
    if (message.videoMessage) return "video";
    if (message.audioMessage) return "audio";
    if (message.documentMessage) return "document";
    if (message.stickerMessage) return "sticker";
    if (message.locationMessage) return "location";
    if (message.contactMessage) return "contact";

    return "unknown";
  }

  /**
   * Verifica se mensagem é de um grupo
   * @param jid - JID para verificar
   * @returns true se for grupo
   */
  static isGroup(jid: string): boolean {
    return jid.endsWith("@g.us");
  }

  /**
   * Extrai número de telefone do JID
   * @param jid - JID do WhatsApp
   * @returns Número de telefone limpo
   */
  static extractPhoneNumber(jid: string): string {
    return jid.replace(/[^\d]/g, "");
  }
}
