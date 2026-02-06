/**
 * Message Gateway - V1.1.1 STEP-01
 * Central gateway for processing messages from multiple channels
 *
 * Features:
 * - Channel abstraction (WhatsApp, Telegram, Discord, etc)
 * - Message normalization
 * - Deduplication (prevents processing same message twice)
 * - Event-based architecture
 */

import { EventEmitter } from "node:events";
import { NormalizedMessage, MessageAdapter, GatewayConfig } from "./types";

export class MessageGateway extends EventEmitter {
  private adapters: Map<string, MessageAdapter> = new Map();
  private seenMessages: Map<string, number> = new Map();
  private config: GatewayConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: GatewayConfig = { deduplication: true, deduplicationTTL: 300000 }) {
    super();
    this.config = config;

    // Limpeza periódica de mensagens vistas (a cada 1 minuto)
    this.cleanupTimer = setInterval(() => this.cleanupSeenMessages(), 60000);

    console.log("[Gateway] Inicializado", {
      deduplication: config.deduplication,
      ttl: `${config.deduplicationTTL / 1000}s`,
    });
  }

  /**
   * Registra um adaptador de canal
   * @param adapter - Adaptador a ser registrado
   */
  registerAdapter(adapter: MessageAdapter): void {
    this.adapters.set(adapter.name, adapter);
    console.log(`[Gateway] Adapter registrado: ${adapter.name}`);
  }

  /**
   * Processa uma mensagem bruta de um canal
   * @param channel - Nome do canal (whatsapp, telegram, etc)
   * @param rawMessage - Mensagem no formato original do canal
   */
  async processRawMessage(channel: string, rawMessage: any): Promise<void> {
    const adapter = this.adapters.get(channel);

    if (!adapter) {
      console.error(`[Gateway] Adapter não encontrado: ${channel}`);
      return;
    }

    try {
      // Normalizar mensagem
      const normalized = adapter.normalize(rawMessage);

      // Validar mensagem
      if (!normalized.text.trim()) {
        console.log("[Gateway] Mensagem vazia ignorada");
        return;
      }

      // Deduplicação
      if (this.config.deduplication && this.isDuplicate(normalized.id)) {
        console.log(`[Gateway] Mensagem duplicada ignorada: ${normalized.id}`);
        return;
      }

      if (this.config.deduplication) {
        this.markAsSeen(normalized.id);
      }

      console.log(`[Gateway] Mensagem processada de ${channel}:`, {
        id: normalized.id,
        from: normalized.from,
        text: normalized.text.slice(0, 50) + (normalized.text.length > 50 ? "..." : ""),
      });

      // Emite evento para ser processado pelo sistema
      this.emit("message", normalized);
    } catch (error) {
      console.error(`[Gateway] Erro ao processar mensagem:`, error);
      this.emit("error", { channel, error, rawMessage });
    }
  }

  /**
   * Envia uma mensagem através de um canal específico
   * @param channel - Nome do canal
   * @param to - Destinatário
   * @param message - Texto da mensagem
   */
  async sendMessage(channel: string, to: string, message: string): Promise<void> {
    const adapter = this.adapters.get(channel);

    if (!adapter) {
      throw new Error(`[Gateway] Adapter não encontrado: ${channel}`);
    }

    try {
      await adapter.send(to, message);
      console.log(`[Gateway] Mensagem enviada via ${channel} para ${to}`);
    } catch (error) {
      console.error(`[Gateway] Erro ao enviar mensagem:`, error);
      throw error;
    }
  }

  /**
   * Verifica se uma mensagem já foi vista
   * @param messageId - ID da mensagem
   * @returns true se já foi vista
   */
  private isDuplicate(messageId: string): boolean {
    return this.seenMessages.has(messageId);
  }

  /**
   * Marca uma mensagem como vista
   * @param messageId - ID da mensagem
   */
  private markAsSeen(messageId: string): void {
    this.seenMessages.set(messageId, Date.now());
  }

  /**
   * Remove mensagens vistas antigas (baseado no TTL)
   */
  private cleanupSeenMessages(): void {
    const now = Date.now();
    const ttl = this.config.deduplicationTTL;
    let removed = 0;

    for (const [id, timestamp] of this.seenMessages.entries()) {
      if (now - timestamp > ttl) {
        this.seenMessages.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Gateway] Cleanup: ${removed} mensagens antigas removidas`);
    }
  }

  /**
   * Retorna estatísticas do gateway
   */
  getStats(): {
    adapters: number;
    seenMessages: number;
    config: GatewayConfig;
  } {
    return {
      adapters: this.adapters.size,
      seenMessages: this.seenMessages.size,
      config: this.config,
    };
  }

  /**
   * Limpa recursos e para timers
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.removeAllListeners();
    this.adapters.clear();
    this.seenMessages.clear();
    console.log("[Gateway] Destruído");
  }
}
