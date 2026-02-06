/**
 * Base Agent - V1.1.1 STEP-02
 * Abstract base class for all specialized agents
 */

import Anthropic from "@anthropic-ai/sdk";

export interface AgentExecuteParams {
  /** User message */
  message: string;

  /** Classified intent */
  intent: string;

  /** Extracted arguments */
  args: Record<string, any>;

  /** Context from memory/history */
  context: string;

  /** User identifier */
  userId: string;

  /** Thread identifier */
  threadId: string;
}

export interface AgentExecuteResult {
  /** Response text */
  response: string;

  /** Optional actions to execute */
  actions?: Array<{
    type: string;
    payload: any;
  }>;
}

export abstract class BaseAgent {
  protected client: Anthropic;

  /** Agent name (e.g., "chat", "email", "script") */
  abstract name: string;

  /** Agent description */
  abstract description: string;

  /**
   * Check if this agent can handle the given intent
   * @param intent - Intent to check
   * @returns true if agent can handle
   */
  abstract canHandle(intent: string): boolean;

  /**
   * Execute agent logic
   * @param params - Execution parameters
   * @returns Result with response and optional actions
   */
  abstract execute(params: AgentExecuteParams): Promise<AgentExecuteResult>;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY || "";
    if (!apiKey) {
      console.warn(`[${this.constructor.name}] ANTHROPIC_API_KEY não configurada`);
    }
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Helper: Call Claude API
   * @param system - System prompt
   * @param userMessage - User message
   * @param model - Model to use
   * @returns Response text
   */
  protected async callClaude(
    system: string,
    userMessage: string,
    model: string = "claude-sonnet-4-5-20250929"
  ): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: 4096,
        temperature: 0.3,
        system,
        messages: [{ role: "user", content: userMessage }],
      });

      const content = response.content[0];
      return content.type === "text" ? content.text : "";
    } catch (error) {
      console.error(`[${this.name}] Erro ao chamar Claude:`, error);
      throw error;
    }
  }

  /**
   * Helper: Extract JSON from text
   * @param text - Text containing JSON
   * @returns Parsed JSON or null
   */
  protected extractJSON<T>(text: string): T | null {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch {
      return null;
    }
  }
}
