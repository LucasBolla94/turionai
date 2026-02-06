/**
 * Integration Test - V1.1.1 STEP-04
 * Testa integração: Orchestrator + Agents + Memory
 *
 * Como rodar:
 * npx tsx src/test-integration.ts
 *
 * Com API key:
 * ANTHROPIC_API_KEY=... npx tsx src/test-integration.ts
 */

import { BrainOrchestrator } from "./brain/orchestrator";
import { ChatAgent } from "./brain/agents/chatAgent";
import { CronAgent } from "./brain/agents/cronAgent";
import { MemorySystem } from "./brain/memory";

console.log("🧪 Teste de Integração - STEP-04\n");
console.log("Testando: Orchestrator + Agents + Memory\n");

async function runTests() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Criar componentes
  const orchestrator = new BrainOrchestrator();
  const memory = new MemorySystem();
  await memory.initialize();

  // Registrar agentes reais
  orchestrator.registerAgent(new ChatAgent());
  orchestrator.registerAgent(new CronAgent());

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 1: Saudação com ChatAgent
  console.log("📝 TESTE 1: Saudação casual (ChatAgent)\n");

  const context1 = await memory.buildContext("test_user", "oi");
  const result1 = await orchestrator.process({
    message: "Oi! Tudo bem?",
    userId: "test_user",
    threadId: "test_thread",
    channel: "test",
    context: context1,
  });

  console.log("\n✅ Resultado:");
  console.log("  Resposta:", result1.response);
  console.log("  Intent:", result1.metadata?.intent);
  console.log("  Confidence:", result1.metadata?.confidence + "%");
  console.log("  Agent:", result1.metadata?.agentType);

  // Salvar na memória
  if (result1.shouldSaveMemory) {
    memory.addMessage("test_thread", `Usuário: Oi! Tudo bem?`, false);
    memory.addMessage("test_thread", `Bot: ${result1.response}`, false);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 2: Criar lembrete com CronAgent
  console.log("📝 TESTE 2: Criar lembrete (CronAgent)\n");

  const context2 = await memory.buildContext("test_user", "me lembra");
  const result2 = await orchestrator.process({
    message: "Me lembra de fazer deploy às 15h",
    userId: "test_user",
    threadId: "test_thread",
    channel: "test",
    context: context2,
  });

  console.log("\n✅ Resultado:");
  console.log("  Resposta:", result2.response);
  console.log("  Intent:", result2.metadata?.intent);
  console.log("  Confidence:", result2.metadata?.confidence + "%");
  console.log("  Agent:", result2.metadata?.agentType);
  console.log("  Actions:", result2.actions ? result2.actions.length : 0);

  if (result2.actions && result2.actions.length > 0) {
    console.log("  Action type:", result2.actions[0].type);
    console.log("  Action payload:", JSON.stringify(result2.actions[0].payload, null, 2));
  }

  // Salvar na memória (importante!)
  if (result2.shouldSaveMemory) {
    memory.addMessage("test_thread", `Usuário: Me lembra de fazer deploy às 15h`, true);
    memory.addMessage("test_thread", `Bot: ${result2.response}`, false);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 3: Conversa com contexto de memória
  console.log("📝 TESTE 3: Conversa com contexto (Memory)\n");

  const context3 = await memory.buildContext("test_user", "oque temos marcado");
  console.log("  📄 Contexto gerado (preview):");
  console.log(context3.split("\n").slice(0, 10).map(l => `    ${l}`).join("\n"));
  console.log("    ...\n");

  const result3 = await orchestrator.process({
    message: "O que temos marcado?",
    userId: "test_user",
    threadId: "test_thread",
    channel: "test",
    context: context3,
  });

  console.log("✅ Resultado:");
  console.log("  Resposta:", result3.response);
  console.log("  Intent:", result3.metadata?.intent);
  console.log("  Confidence:", result3.metadata?.confidence + "%");
  console.log("  Usou memória:", context3.includes("deploy") ? "SIM ✅" : "NÃO ❌");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 4: Estatísticas finais
  console.log("📝 TESTE 4: Estatísticas do sistema\n");

  const orchStats = orchestrator.getStats();
  const memStats = memory.getStats();

  console.log("📊 Orchestrator:");
  console.log(JSON.stringify(orchStats, null, 2));

  console.log("\n📊 Memory System:");
  console.log(JSON.stringify(memStats, null, 2));

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("✅ Todos os testes de integração concluídos!\n");
  console.log("Componentes validados:");
  console.log("  ✅ BrainOrchestrator");
  console.log("  ✅ ChatAgent");
  console.log("  ✅ CronAgent");
  console.log("  ✅ MemorySystem");
  console.log("\nPróximos passos:");
  console.log("  1. Implementar mais agentes (EmailAgent, LogsAgent, etc)");
  console.log("  2. Integrar com Gateway (STEP-01)");
  console.log("  3. Conectar ao sistema legado (Migration Wrapper)\n");
}

// Executar testes
runTests().catch(console.error);
