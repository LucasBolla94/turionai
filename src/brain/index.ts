/**
 * Brain Module - V1.1.1 STEP-02 + STEP-03 + STEP-04
 * Exports for brain orchestrator, memory system, and agents
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

// Specialized Agents (STEP-04)
export { ChatAgent, CronAgent } from "./agents";

// Migration Wrapper (STEP-05)
export { processBrainMessage, getBrainSystemStats, resetBrainSystem } from "./migrationWrapper";
