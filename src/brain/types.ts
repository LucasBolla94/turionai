/**
 * Brain Types - V1.1.1 STEP-02 + STEP-06
 * Interface definitions for brain orchestrator system
 */

/**
 * Action to be executed by Action Executor (STEP-06)
 */
export interface Action {
  /** Action type (e.g., "cron.create", "email.send") */
  type: string;

  /** Action payload (specific to each action type) */
  payload: any;
}

export interface IntentClassification {
  /** Identified intent (e.g., "list_emails", "create_reminder") */
  intent: string;

  /** Agent type to handle this intent */
  agentType: string;

  /** Confidence level (0-100) */
  confidence: number;

  /** Extracted arguments from user message */
  args: Record<string, any>;

  /** Whether clarification is needed */
  needsClarification: boolean;

  /** Clarification question if needed */
  clarificationQuestion?: string;
}

export interface ProcessRequest {
  /** User message text */
  message: string;

  /** User identifier */
  userId: string;

  /** Thread/conversation identifier */
  threadId: string;

  /** Source channel (whatsapp, telegram, etc) */
  channel: string;

  /** Optional context from memory/history */
  context?: string;
}

export interface ProcessResult {
  /** Response text to send to user */
  response: string;

  /** Optional actions to execute */
  actions?: Action[];

  /** Whether to save this interaction in memory */
  shouldSaveMemory?: boolean;

  /** Metadata about the processing */
  metadata?: {
    intent?: string;
    agentType?: string;
    confidence?: number;
    processingTime?: number;
  };
}
