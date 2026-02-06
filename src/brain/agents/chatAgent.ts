/**
 * Chat Agent - V1.1.1 STEP-04
 * Agente para conversa casual e saudações
 */

import { BaseAgent, AgentExecuteParams, AgentExecuteResult } from "./baseAgent";

export class ChatAgent extends BaseAgent {
  name = "chat";
  description = "Agente de conversa casual, saudações e interações gerais";

  /**
   * Verifica se este agente pode lidar com o intent
   */
  canHandle(intent: string): boolean {
    const chatIntents = [
      "chat",
      "saudacao",
      "conversa",
      "casual",
      "oi",
      "ola",
      "bom dia",
      "boa tarde",
      "boa noite",
    ];

    return chatIntents.some((keyword) =>
      intent.toLowerCase().includes(keyword)
    );
  }

  /**
   * Executa conversa casual com Claude
   */
  async execute(params: AgentExecuteParams): Promise<AgentExecuteResult> {
    console.log(`  [ChatAgent] Processando: "${params.message}"`);

    const systemPrompt = `Você é o Turion, um assistente pessoal casual, amigável e direto.

PERSONALIDADE:
- Informal mas respeitoso (use "você", não "senhor/senhora")
- Respostas curtas e objetivas (máximo 2-3 frases)
- Use emojis ocasionalmente quando apropriado
- Seja prestativo e proativo
- Lembre que você pode executar tarefas (scripts, emails, lembretes, etc)

CONTEXTO DO USUÁRIO:
${params.context || "Nenhum contexto disponível"}

INTENT IDENTIFICADO:
${params.intent}

ARGUMENTOS EXTRAS:
${JSON.stringify(params.args, null, 2)}

INSTRUÇÕES:
- Responda de forma natural e casual
- Se o usuário perguntar sobre suas capacidades, mencione: gerenciar emails, criar lembretes, executar scripts, visualizar logs, operações git
- Se não houver contexto suficiente, peça mais informações
- Mantenha a conversa fluida e natural`;

    try {
      const response = await this.callClaude(systemPrompt, params.message);

      return {
        response: response.trim(),
      };
    } catch (error) {
      console.error("[ChatAgent] Erro ao processar:", error);
      return {
        response:
          "Desculpa, tive um problema aqui. Pode tentar de novo? 🤔",
      };
    }
  }
}
