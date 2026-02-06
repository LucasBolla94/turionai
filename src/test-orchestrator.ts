/**
 * Test Orchestrator - V1.1.1 STEP-02
 * Script de teste para validar o BrainOrchestrator
 *
 * Como rodar:
 * npx tsx src/test-orchestrator.ts
 */

import { BrainOrchestrator } from "./brain/orchestrator";
import { BaseAgent, type AgentExecuteParams } from "./brain/agents/baseAgent";

console.log("🧪 Teste do Brain Orchestrator - STEP-02\n");

// Mock ChatAgent para testes
class MockChatAgent extends BaseAgent {
  name = "chat";
  description = "Agente de conversa casual";

  canHandle(intent: string): boolean {
    return intent === "chat" || intent.includes("saudacao") || intent.includes("casual");
  }

  async execute(params: AgentExecuteParams) {
    console.log(`  [ChatAgent] Processando: "${params.message}"`);
    return {
      response: `Oi! Você disse: "${params.message}". Como posso ajudar?`,
    };
  }
}

// Mock CronAgent para testes
class MockCronAgent extends BaseAgent {
  name = "cron";
  description = "Agente de lembretes e tarefas agendadas";

  canHandle(intent: string): boolean {
    return intent === "cron" || intent.includes("lembrete") || intent.includes("agendar");
  }

  async execute(params: AgentExecuteParams) {
    console.log(`  [CronAgent] Criando lembrete: ${params.args.message || "sem mensagem"}`);
    return {
      response: `Fechado! Vou te lembrar em ${params.args.delay || "um tempo"}: ${params.args.message || "lembrete"}`,
    };
  }
}

async function runTests() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Criar orchestrator
  const orchestrator = new BrainOrchestrator();

  // Registrar agents mock
  orchestrator.registerAgent(new MockChatAgent());
  orchestrator.registerAgent(new MockCronAgent());

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 1: Saudação (alta confiança)
  console.log("📝 TESTE 1: Saudação (alta confiança)\n");

  const result1 = await orchestrator.process({
    message: "oi tudo bem?",
    userId: "test_user",
    threadId: "test_thread",
    channel: "test",
  });

  console.log("\n✅ Resultado:");
  console.log("  Resposta:", result1.response);
  console.log("  Metadata:", JSON.stringify(result1.metadata, null, 2));

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 2: Criar lembrete (alta confiança)
  console.log("📝 TESTE 2: Criar lembrete (alta confiança)\n");

  const result2 = await orchestrator.process({
    message: "me lembra de ligar pro João em 10 minutos",
    userId: "test_user",
    threadId: "test_thread",
    channel: "test",
  });

  console.log("\n✅ Resultado:");
  console.log("  Resposta:", result2.response);
  console.log("  Metadata:", JSON.stringify(result2.metadata, null, 2));

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 3: Mensagem vaga (baixa confiança)
  console.log("📝 TESTE 3: Mensagem vaga (baixa confiança)\n");

  const result3 = await orchestrator.process({
    message: "aquilo",
    userId: "test_user",
    threadId: "test_thread",
    channel: "test",
  });

  console.log("\n✅ Resultado:");
  console.log("  Resposta:", result3.response);
  console.log("  Deve pedir clarificação:", result3.metadata?.confidence ?? 0 < 60 ? "SIM ✅" : "NÃO ❌");
  console.log("  Metadata:", JSON.stringify(result3.metadata, null, 2));

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 4: Agente não existente
  console.log("📝 TESTE 4: Intent sem agente correspondente\n");

  const result4 = await orchestrator.process({
    message: "configure o blockchain quantum",
    userId: "test_user",
    threadId: "test_thread",
    channel: "test",
  });

  console.log("\n✅ Resultado:");
  console.log("  Resposta:", result4.response);
  console.log("  Metadata:", JSON.stringify(result4.metadata, null, 2));

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 5: Estatísticas
  console.log("📝 TESTE 5: Estatísticas do orchestrator\n");

  const stats = orchestrator.getStats();
  console.log("Estatísticas:", JSON.stringify(stats, null, 2));

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("✅ Todos os testes concluídos!\n");
  console.log("Próximos passos:");
  console.log("1. Implementar agentes reais (ChatAgent, EmailAgent, etc)");
  console.log("2. Integrar com Gateway (STEP-01)");
  console.log("3. Adicionar Memory System (STEP-03)\n");
}

// Executar testes
runTests().catch(console.error);
