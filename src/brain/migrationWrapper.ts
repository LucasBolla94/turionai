/**
 * Migration Wrapper - V1.1.1 STEP-05
 *
 * Conecta o novo Brain System (Orchestrator + Agents + Memory) ao código legado.
 * Permite migração gradual controlada por feature flag.
 *
 * Feature Flag: TURION_USE_BRAIN_V2=true (ativa novo sistema)
 */

import type { WASocket } from "baileys";
import { BrainOrchestrator } from "./orchestrator";
import { MemorySystem } from "./memory";
import { ChatAgent, CronAgent } from "./agents";
import { executeActions } from "./actionExecutor";

// Singleton instances (lazy initialization)
let orchestratorInstance: BrainOrchestrator | null = null;
let memoryInstance: MemorySystem | null = null;

/**
 * Verifica se deve usar o novo Brain System V2
 */
function shouldUseBrainV2(): boolean {
  const flag = process.env.TURION_USE_BRAIN_V2;
  return flag === "true" || flag === "1";
}

/**
 * Inicializa o Brain System V2 (apenas uma vez)
 */
async function initializeBrainV2(): Promise<{ orchestrator: BrainOrchestrator; memory: MemorySystem }> {
  if (!orchestratorInstance || !memoryInstance) {
    console.log("[MigrationWrapper] Inicializando Brain System V2...");

    // Criar orchestrator
    orchestratorInstance = new BrainOrchestrator();

    // Registrar agentes disponíveis
    orchestratorInstance.registerAgent(new ChatAgent());
    orchestratorInstance.registerAgent(new CronAgent());

    // Criar e inicializar memória
    memoryInstance = new MemorySystem();
    await memoryInstance.initialize();

    console.log("[MigrationWrapper] Brain System V2 inicializado ✅");
  }

  return {
    orchestrator: orchestratorInstance,
    memory: memoryInstance,
  };
}

/**
 * Processa mensagem usando o Brain System V2
 */
async function processBrainV2(params: {
  socket: WASocket;
  message: string;
  userId: string;
  threadId: string;
  from: string;
}): Promise<string> {
  const { orchestrator, memory } = await initializeBrainV2();

  console.log(`[MigrationWrapper][V2] Processando mensagem de ${params.userId}`);

  try {
    // Construir contexto das 3 camadas de memória
    const context = await memory.buildContext(params.threadId, params.message);

    // Processar via orchestrator
    const result = await orchestrator.process({
      message: params.message,
      userId: params.userId,
      threadId: params.threadId,
      channel: "whatsapp",
      context,
    });

    // Salvar na memória se necessário
    if (result.shouldSaveMemory) {
      const isImportant = !!(result.actions && result.actions.length > 0);
      memory.addMessage(params.threadId, `Usuário: ${params.message}`, isImportant);
      memory.addMessage(params.threadId, `Bot: ${result.response}`, false);
    }

    // Executar actions (se houver)
    if (result.actions && result.actions.length > 0) {
      console.log(`[MigrationWrapper][V2] Actions geradas: ${result.actions.length}`);

      try {
        const executionResults = await executeActions(result.actions);

        for (let i = 0; i < executionResults.length; i++) {
          const execResult = executionResults[i];
          const action = result.actions[i];

          if (execResult.success) {
            console.log(`[MigrationWrapper][V2] Action ${action.type} executada com sucesso`);
          } else {
            console.error(`[MigrationWrapper][V2] Action ${action.type} falhou:`, execResult.error);
          }
        }
      } catch (error) {
        console.error("[MigrationWrapper][V2] Erro ao executar actions:", error);
      }
    }

    console.log(`[MigrationWrapper][V2] Resposta gerada (${result.response.length} chars)`);
    return result.response;

  } catch (error) {
    console.error("[MigrationWrapper][V2] Erro ao processar mensagem:", error);
    throw error;
  }
}

/**
 * Processa mensagem delegando para o sistema legado (handleBrain)
 *
 * IMPORTANTE: Esta função é um placeholder.
 * O código legado permanece em src/channels/whatsapp.ts (handleBrain)
 *
 * @returns null (indica que deve usar o fluxo legado normal)
 */
async function processBrainLegacy(params: {
  socket: WASocket;
  message: string;
  userId: string;
  threadId: string;
  from: string;
}): Promise<string | null> {
  console.log(`[MigrationWrapper][Legacy] Delegando para sistema legado`);

  // Retorna null para indicar que o fluxo legado deve continuar
  // O código em whatsapp.ts vai chamar handleBrain() normalmente
  return null;
}

/**
 * Função principal do Migration Wrapper
 *
 * Decide entre Brain V2 (novo sistema) ou Legacy (sistema antigo)
 * baseado na feature flag TURION_USE_BRAIN_V2.
 *
 * @returns string - Resposta gerada pelo Brain V2, ou null se usar legado
 */
export async function processBrainMessage(params: {
  socket: WASocket;
  message: string;
  userId: string;
  threadId: string;
  from: string;
}): Promise<string | null> {
  const useBrainV2 = shouldUseBrainV2();

  console.log(`[MigrationWrapper] Sistema ativo: ${useBrainV2 ? "Brain V2 🚀" : "Legacy"}`);

  if (useBrainV2) {
    try {
      return await processBrainV2(params);
    } catch (error) {
      console.error("[MigrationWrapper] Erro no Brain V2, fallback para Legacy:", error);
      return await processBrainLegacy(params);
    }
  } else {
    return await processBrainLegacy(params);
  }
}

/**
 * Retorna estatísticas do sistema ativo
 */
export function getBrainSystemStats(): {
  active: "brain_v2" | "legacy";
  initialized: boolean;
  orchestrator?: any;
  memory?: any;
} {
  const useBrainV2 = shouldUseBrainV2();

  if (useBrainV2 && orchestratorInstance && memoryInstance) {
    return {
      active: "brain_v2",
      initialized: true,
      orchestrator: orchestratorInstance.getStats(),
      memory: memoryInstance.getStats(),
    };
  }

  return {
    active: useBrainV2 ? "brain_v2" : "legacy",
    initialized: false,
  };
}

/**
 * Reseta instâncias (útil para testes)
 */
export function resetBrainSystem(): void {
  orchestratorInstance = null;
  memoryInstance = null;
  console.log("[MigrationWrapper] Sistema resetado");
}
