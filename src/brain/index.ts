/**
 * Brain Module - V1.1.1 STEP-02 + STEP-03
 * Exports for brain orchestrator and memory system
 */

export { BrainOrchestrator } from "./orchestrator";
export { BaseAgent } from "./agents/baseAgent";
export type {
  IntentClassification,
  ProcessRequest,
  ProcessResult,
  AgentExecuteParams,
  AgentExecuteResult,
} from "./types";
export type { AgentExecuteParams as BaseAgentExecuteParams } from "./agents/baseAgent";

// Memory System (STEP-03)
export { MemorySystem, ShortTermMemory, SessionMemory, LongTermMemory } from "./memory";
export type { LongTermEntry } from "./memory";
