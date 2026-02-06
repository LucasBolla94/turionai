/**
 * Brain Module - V1.1.1 STEP-02 + STEP-03 + STEP-04 + STEP-05 + STEP-06
 * Exports for brain orchestrator, memory system, agents, migration wrapper, and action executor
 */

export { BrainOrchestrator } from "./orchestrator";
export { BaseAgent } from "./agents/baseAgent";
export type {
  Action,
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

// Action Executor (STEP-06)
export {
  executeAction,
  executeActions,
  getActionExecutorStats,
} from "./actionExecutor";
export type { ActionExecutionResult } from "./actionExecutor";
