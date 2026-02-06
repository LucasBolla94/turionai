/**
 * Brain Orchestrator - V1.1.1 STEP-02
 * Central orchestrator that classifies intents and delegates to specialized agents
 *
 * Features:
 * - Intent classification with Claude
 * - Confidence-based decision making
 * - Agent delegation
 * - Automatic clarification requests
 * - Fallback handling
 */

import Anthropic from "@anthropic-ai/sdk";
import { IntentClassification, ProcessRequest, ProcessResult } from "./types";
import { BaseAgent } from "./agents/baseAgent";

export class BrainOrchestrator {
  private client: Anthropic;
  private agents: Map<string, BaseAgent> = new Map();

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY || "";
    if (!apiKey) {
      console.warn("[Orchestrator] ANTHROPIC_API_KEY não configurada");
    }
    this.client = new Anthropic({ apiKey });

    console.log("[Orchestrator] Inicializado");
  }

  /**
   * Register a specialized agent
   * @param agent - Agent to register
   */
  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.name, agent);
    console.log(`[Orchestrator] Agente registrado: ${agent.name} - ${agent.description}`);
  }

  /**
   * Process a user message
   * @param request - Process request
   * @returns Process result with response
   */
  async process(request: ProcessRequest): Promise<ProcessResult> {
    const startTime = Date.now();
    console.log(`[Orchestrator] Processando: "${request.message.slice(0, 50)}..."`);

    try {
      // STEP 1: Classify intent
      const classification = await this.classifyIntent(request);

      console.log(`[Orchestrator] Intent: ${classification.intent}, Confiança: ${classification.confidence}%`);

      // STEP 2: If confidence too low, request clarification
      if (classification.confidence < 60) {
        console.log("[Orchestrator] Confiança baixa, pedindo clarificação");
        return {
          response: classification.clarificationQuestion ||
                    "Desculpa, não entendi bem. Pode reformular?",
          shouldSaveMemory: false,
          metadata: {
            intent: classification.intent,
            agentType: classification.agentType,
            confidence: classification.confidence,
            processingTime: Date.now() - startTime,
          },
        };
      }

      // STEP 3: Find appropriate agent
      const agent = this.findAgent(classification.agentType);

      if (!agent) {
        console.warn(`[Orchestrator] Agente não encontrado: ${classification.agentType}`);
        return {
          response: "Ainda não sei fazer isso. Pode tentar de outra forma?",
          shouldSaveMemory: false,
          metadata: {
            intent: classification.intent,
            agentType: classification.agentType,
            confidence: classification.confidence,
            processingTime: Date.now() - startTime,
          },
        };
      }

      // STEP 4: Execute via agent
      console.log(`[Orchestrator] Delegando para ${agent.name}`);

      const result = await agent.execute({
        message: request.message,
        intent: classification.intent,
        args: classification.args,
        context: request.context || "",
        userId: request.userId,
        threadId: request.threadId,
      });

      const processingTime = Date.now() - startTime;
      console.log(`[Orchestrator] Processamento concluído em ${processingTime}ms`);

      return {
        response: result.response,
        actions: result.actions,
        shouldSaveMemory: true,
        metadata: {
          intent: classification.intent,
          agentType: classification.agentType,
          confidence: classification.confidence,
          processingTime,
        },
      };
    } catch (error) {
      console.error("[Orchestrator] Erro ao processar:", error);
      return {
        response: "Ops, deu um erro aqui. Pode tentar de novo?",
        shouldSaveMemory: false,
        metadata: {
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Classify user intent using Claude
   * @param request - Process request
   * @returns Intent classification
   */
  private async classifyIntent(request: ProcessRequest): Promise<IntentClassification> {
    const systemPrompt = `Você é um classificador de intenções inteligente para o Turion, um assistente pessoal.

AGENTES DISPONÍVEIS:
- chat: conversa casual, saudações, perguntas gerais
- email: gerenciar emails (listar, ler, responder, deletar)
- cron: criar lembretes e tarefas agendadas
- logs: visualizar logs de sistemas
- script: executar scripts e comandos
- git: operações git (status, commit, push)
- deploy: fazer deploy de projetos

Analise a mensagem do usuário e retorne JSON estruturado:

{
  "intent": "descrição curta da intenção",
  "agentType": "chat|email|cron|logs|script|git|deploy",
  "confidence": 0-100,
  "args": { /* argumentos extraídos */ },
  "needsClarification": true/false,
  "clarificationQuestion": "pergunta se precisar esclarecer"
}

REGRAS DE CLASSIFICAÇÃO:
1. Confiança > 70% → intent específico e args completos
2. Confiança 60-70% → intent provável mas pode ter ambiguidade
3. Confiança < 60% → needsClarification=true, gerar pergunta específica
4. Sempre extraia argumentos relevantes (tempo, nomes, filtros, etc)
5. Se mensagem vaga ("aquilo", "isso"), marque needsClarification

EXEMPLOS DE CLASSIFICAÇÃO:

Input: "me lembra de ligar pro João em 10min"
Output: {"intent": "criar_lembrete", "agentType": "cron", "confidence": 95, "args": {"delay": "10min", "message": "ligar pro João"}, "needsClarification": false}

Input: "tem email importante?"
Output: {"intent": "listar_emails_importantes", "agentType": "email", "confidence": 90, "args": {"filter": "important", "unreadOnly": true}, "needsClarification": false}

Input: "oi tudo bem?"
Output: {"intent": "saudacao", "agentType": "chat", "confidence": 100, "args": {}, "needsClarification": false}

Input: "aquilo que falamos"
Output: {"intent": "referencia_vaga", "agentType": "chat", "confidence": 25, "args": {}, "needsClarification": true, "clarificationQuestion": "Não peguei. Você tá falando de: 1) emails, 2) lembretes, 3) logs, ou 4) outra coisa?"}

Input: "mostra os logs"
Output: {"intent": "visualizar_logs", "agentType": "logs", "confidence": 85, "args": {"limit": 50}, "needsClarification": false}

Input: "faz deploy"
Output: {"intent": "deploy_projeto", "agentType": "deploy", "confidence": 70, "args": {}, "needsClarification": false}

CONTEXTO ADICIONAL (se disponível):
${request.context || "Nenhum contexto disponível"}

IMPORTANTE:
- Seja conservador com confidence (melhor pedir clarificação que errar)
- Perguntas de clarificação devem ser específicas e dar opções
- Extraia TODOS os argumentos possíveis da mensagem`;

    try {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1500,
        temperature: 0.2, // Baixa temperatura para classificação precisa
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Classifique esta mensagem: "${request.message}"`
        }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.error("[Orchestrator] Claude não retornou JSON válido");
        return this.getFallbackClassification();
      }

      const classification = JSON.parse(jsonMatch[0]) as IntentClassification;

      // Validação básica
      if (!classification.intent || !classification.agentType) {
        console.warn("[Orchestrator] Classificação inválida, usando fallback");
        return this.getFallbackClassification();
      }

      return classification;

    } catch (error) {
      console.error("[Orchestrator] Erro na classificação:", error);
      return this.getFallbackClassification();
    }
  }

  /**
   * Find agent by type
   * @param agentType - Agent type to find
   * @returns Agent or undefined
   */
  private findAgent(agentType: string): BaseAgent | undefined {
    // Try exact name match
    let agent = this.agents.get(agentType);
    if (agent) return agent;

    // Try canHandle method
    for (const [_, agent] of this.agents) {
      if (agent.canHandle(agentType)) {
        return agent;
      }
    }

    return undefined;
  }

  /**
   * Fallback classification when Claude fails
   * @returns Safe fallback classification
   */
  private getFallbackClassification(): IntentClassification {
    return {
      intent: "unknown",
      agentType: "chat",
      confidence: 30,
      args: {},
      needsClarification: true,
      clarificationQuestion: "Não entendi. Pode explicar melhor o que você quer?",
    };
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): {
    agents: number;
    agentNames: string[];
  } {
    return {
      agents: this.agents.size,
      agentNames: Array.from(this.agents.keys()),
    };
  }
}
