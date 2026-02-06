/**
 * Action Executor - V1.1.1 STEP-06
 *
 * Conecta actions geradas pelos agentes do Brain V2 aos executores legados.
 * Executa ações como criar lembretes, enviar emails, rodar scripts, etc.
 *
 * Integração:
 * - cron.create → cronManager.createCronNormalized()
 * - email.send → emailClient (futuro)
 * - script.run → executor (futuro)
 */

import { createCronNormalized } from "../core/cronManager";
import type { Action } from "./types";

/**
 * Resultado da execução de uma action
 */
export interface ActionExecutionResult {
  success: boolean;
  message: string;
  error?: string;
  data?: any;
}

/**
 * Executa uma action conectando ao executor legado apropriado
 */
export async function executeAction(action: Action): Promise<ActionExecutionResult> {
  console.log(`[ActionExecutor] Executando action: ${action.type}`);

  try {
    switch (action.type) {
      case "cron.create":
        return await executeCronCreate(action);

      case "email.send":
        return await executeEmailSend(action);

      case "script.run":
        return await executeScriptRun(action);

      default:
        console.warn(`[ActionExecutor] Action type desconhecido: ${action.type}`);
        return {
          success: false,
          message: `Action type '${action.type}' não suportado`,
          error: "UNSUPPORTED_ACTION_TYPE",
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ActionExecutor] Erro ao executar action ${action.type}:`, errorMessage);

    return {
      success: false,
      message: `Erro ao executar ${action.type}`,
      error: errorMessage,
    };
  }
}

/**
 * Executa múltiplas actions em sequência
 */
export async function executeActions(actions: Action[]): Promise<ActionExecutionResult[]> {
  console.log(`[ActionExecutor] Executando ${actions.length} actions`);

  const results: ActionExecutionResult[] = [];

  for (const action of actions) {
    const result = await executeAction(action);
    results.push(result);

    // Se uma action falhar, continuar com as próximas
    if (!result.success) {
      console.warn(`[ActionExecutor] Action ${action.type} falhou, continuando...`);
    }
  }

  return results;
}

/**
 * Executa action cron.create
 * Conecta com cronManager.createCronNormalized()
 */
async function executeCronCreate(action: Action): Promise<ActionExecutionResult> {
  const { message, delay, userId, threadId } = action.payload as {
    message: string;
    delay: string;
    userId: string;
    threadId: string;
  };

  console.log(`[ActionExecutor][Cron] Criando lembrete: "${message}" (delay: ${delay})`);

  try {
    // Converter delay para schedule
    const schedule = convertDelayToSchedule(delay);

    // Criar cron job usando executor legado
    const cronJob = await createCronNormalized({
      name: `reminder_${Date.now()}_${userId.slice(-4)}`,
      schedule,
      jobType: "reminder",
      payload: JSON.stringify({
        to: threadId,
        message,
        userId,
      }),
      runOnce: true,
    });

    console.log(`[ActionExecutor][Cron] Lembrete criado: ${cronJob.name}`);

    return {
      success: true,
      message: `Lembrete criado para ${delay}`,
      data: { cronJob },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ActionExecutor][Cron] Erro:`, errorMessage);

    return {
      success: false,
      message: `Erro ao criar lembrete: ${errorMessage}`,
      error: errorMessage,
    };
  }
}

/**
 * Converte delay para schedule do cron
 *
 * Formatos suportados:
 * - "15:00" ou "15h" → hora específica hoje
 * - "10min" → daqui 10 minutos
 * - "1h" → daqui 1 hora
 * - ISO date string → data específica
 */
function convertDelayToSchedule(delay: string): string {
  const now = new Date();

  // Formato: "15:00" ou "15h"
  if (/^\d{1,2}:\d{2}$/.test(delay) || /^\d{1,2}h$/.test(delay)) {
    const hour = delay.includes(":")
      ? parseInt(delay.split(":")[0], 10)
      : parseInt(delay.replace("h", ""), 10);

    const target = new Date(now);
    target.setHours(hour, 0, 0, 0);

    // Se já passou, agendar para amanhã
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }

    return target.toISOString();
  }

  // Formato: "10min"
  if (/^\d+min$/.test(delay)) {
    const minutes = parseInt(delay.replace("min", ""), 10);
    const target = new Date(now.getTime() + minutes * 60 * 1000);
    return target.toISOString();
  }

  // Formato: "1h" (uma hora a partir de agora)
  if (/^\d+h$/.test(delay) && !delay.includes(":")) {
    const hours = parseInt(delay.replace("h", ""), 10);
    const target = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return target.toISOString();
  }

  // Formato: ISO date (já no formato correto)
  if (delay.includes("T") || delay.includes("Z")) {
    return delay;
  }

  // Default: 1 hora a partir de agora
  console.warn(`[ActionExecutor][Cron] Delay format desconhecido: "${delay}", usando 1h`);
  const target = new Date(now.getTime() + 60 * 60 * 1000);
  return target.toISOString();
}

/**
 * Executa action email.send
 * TODO: Conectar com emailClient quando estiver pronto
 */
async function executeEmailSend(action: Action): Promise<ActionExecutionResult> {
  console.log(`[ActionExecutor][Email] TODO: Implementar email.send`);

  return {
    success: false,
    message: "Email sending não implementado ainda",
    error: "NOT_IMPLEMENTED",
  };
}

/**
 * Executa action script.run
 * TODO: Conectar com executor quando estiver pronto
 */
async function executeScriptRun(action: Action): Promise<ActionExecutionResult> {
  console.log(`[ActionExecutor][Script] TODO: Implementar script.run`);

  return {
    success: false,
    message: "Script execution não implementado ainda",
    error: "NOT_IMPLEMENTED",
  };
}

/**
 * Retorna estatísticas do executor
 */
export function getActionExecutorStats(): {
  supportedActions: string[];
  implementedActions: string[];
  pendingActions: string[];
} {
  return {
    supportedActions: ["cron.create", "email.send", "script.run"],
    implementedActions: ["cron.create"],
    pendingActions: ["email.send", "script.run"],
  };
}
