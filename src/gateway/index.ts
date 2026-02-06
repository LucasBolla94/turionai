/**
 * Gateway Module - V1.1.1 STEP-01
 * Exports for gateway system
 */

export { MessageGateway } from "./messageGateway";
export { WhatsAppAdapter } from "./adapters/whatsappAdapter";
export type {
  NormalizedMessage,
  MessageAdapter,
  GatewayConfig
} from "./types";
