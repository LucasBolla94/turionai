/**
 * Gateway Types - V1.1.1 STEP-01
 * Interface definitions for message gateway system
 */

export interface NormalizedMessage {
  /** Unique message identifier */
  id: string;

  /** Message text content */
  text: string;

  /** Remote JID (group or individual) */
  from: string;

  /** Actual sender user ID */
  userId: string;

  /** Thread identifier (for conversation tracking) */
  threadId: string;

  /** Source channel */
  channel: "whatsapp" | "telegram" | "discord" | "http";

  /** Message timestamp (milliseconds) */
  timestamp: number;

  /** Channel-specific metadata */
  metadata?: Record<string, any>;
}

export interface MessageAdapter {
  /** Adapter name (e.g., "whatsapp") */
  name: string;

  /**
   * Normalize a raw message to standard format
   * @param rawMessage - Channel-specific message object
   * @returns Normalized message
   */
  normalize(rawMessage: any): NormalizedMessage;

  /**
   * Send a message through this channel
   * @param to - Recipient identifier
   * @param message - Message text to send
   */
  send(to: string, message: string): Promise<void>;
}

export interface GatewayConfig {
  /** Enable message deduplication */
  deduplication: boolean;

  /** Time-to-live for seen messages (milliseconds) */
  deduplicationTTL: number;
}
