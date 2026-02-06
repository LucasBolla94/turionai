/**
 * Cron Agent - V1.1.1 STEP-04
 * Agente para lembretes e tarefas agendadas
 */

import { BaseAgent, AgentExecuteParams, AgentExecuteResult } from "./baseAgent";

export class CronAgent extends BaseAgent {
  name = "cron";
  description = "Agente de lembretes e tarefas agendadas";

  /**
   * Verifica se este agente pode lidar com o intent
   */
  canHandle(intent: string): boolean {
    const cronIntents = [
      "cron",
      "lembrete",
      "lembra",
      "agendar",
      "agenda",
      "reminder",
      "schedule",
      "timer",
      "alarme",
    ];

    return cronIntents.some((keyword) =>
      intent.toLowerCase().includes(keyword)
    );
  }

  /**
   * Cria lembrete ou tarefa agendada
   */
  async execute(params: AgentExecuteParams): Promise<AgentExecuteResult> {
    console.log(`  [CronAgent] Criando lembrete/agenda: ${params.args.message || params.message}`);

    const systemPrompt = `Você é o módulo de agendamento do Turion.

TAREFA:
Processar solicitação de lembrete ou agendamento e confirmar ao usuário.

CONTEXTO:
${params.context || "Nenhum contexto disponível"}

INTENT IDENTIFICADO:
${params.intent}

ARGUMENTOS EXTRAÍDOS:
${JSON.stringify(params.args, null, 2)}

INSTRUÇÕES:
1. Confirme o lembrete/agendamento de forma clara e objetiva
2. Se houver delay/tempo, mencione quando será executado
3. Se não houver tempo específico, assuma "logo" ou pergunte quando
4. Use linguagem casual e amigável
5. Máximo 2 frases na resposta

EXEMPLOS:
- "Beleza! Vou te lembrar de ligar pro João em 10 minutos ⏰"
- "Agendado! Segunda às 14h vou te lembrar da reunião 📅"
- "Fechado! Quando você quer que eu te lembre?"`;

    try {
      const response = await this.callClaude(systemPrompt, params.message);

      // TODO: Integrar com sistema de cron real (STEP futur)
      const action = {
        type: "cron.create",
        payload: {
          message: params.args.message || params.message,
          delay: params.args.delay || params.args.time || "indefinido",
          userId: params.userId,
          threadId: params.threadId,
        },
      };

      return {
        response: response.trim(),
        actions: [action],
      };
    } catch (error) {
      console.error("[CronAgent] Erro ao processar:", error);
      return {
        response: "Ops, não consegui agendar. Pode tentar de novo? ⏰",
      };
    }
  }
}
