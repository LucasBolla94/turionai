/**
 * Test Memory System - V1.1.1 STEP-03
 * Script de teste para validar o Memory System
 *
 * Como rodar:
 * npx tsx src/test-memory.ts
 */

import { MemorySystem } from "./brain/memory";

console.log("🧪 Teste do Memory System - STEP-03\n");

async function runTests() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Criar sistema de memória
  const memory = new MemorySystem();
  await memory.initialize();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 1: Short-term overflow (buffer circular)
  console.log("📝 TESTE 1: Short-term buffer circular (max 10 msgs)\n");

  for (let i = 1; i <= 15; i++) {
    memory.addMessage("test_thread", `Mensagem ${i}`, false);
  }

  const shortTermMsgs = memory.layers.shortTerm.get();
  console.log(`  ✅ Mensagens no buffer: ${shortTermMsgs.length}`);
  console.log(`  ✅ Primeira mensagem: ${shortTermMsgs[0]}`);
  console.log(`  ✅ Última mensagem: ${shortTermMsgs[shortTermMsgs.length - 1]}`);
  console.log(`  ✅ Deve conter apenas msgs 6-15: ${shortTermMsgs[0] === "Mensagem 6" ? "SIM ✅" : "NÃO ❌"}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 2: Session persistence
  console.log("📝 TESTE 2: Session persistence (salvar e recarregar)\n");

  memory.addMessage("session_1", "Olá, tudo bem?", false);
  memory.addMessage("session_1", "Como você está?", false);
  memory.addMessage("session_2", "Outra conversa", false);

  console.log("  📊 Salvando sessões...");
  await new Promise((resolve) => setTimeout(resolve, 100)); // Aguarda auto-save

  const stats1 = memory.getStats();
  console.log(`  ✅ Sessões antes de reload: ${stats1.session.sessions}`);

  // Criar novo sistema e recarregar
  const memory2 = new MemorySystem();
  await memory2.initialize();

  const stats2 = memory2.getStats();
  console.log(`  ✅ Sessões após reload: ${stats2.session.sessions}`);
  console.log(`  ✅ Dados persistidos: ${stats2.session.sessions >= 2 ? "SIM ✅" : "NÃO ❌"}`);

  const session1Msgs = memory2.layers.session.get("session_1");
  console.log(`  ✅ Mensagens na session_1: ${session1Msgs.length}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 3: Long-term search
  console.log("📝 TESTE 3: Long-term search por keywords\n");

  await memory.layers.longTerm.add({
    text: "Fazer deploy do projeto api em produção",
    timestamp: new Date().toISOString(),
    userId: "user_123",
    category: "task",
    keywords: ["deploy", "projeto", "api", "produção"],
  });

  await memory.layers.longTerm.add({
    text: "João prefere receber emails às segundas",
    timestamp: new Date().toISOString(),
    userId: "user_123",
    category: "preference",
    keywords: ["joão", "emails", "segundas", "preferência"],
  });

  await memory.layers.longTerm.add({
    text: "Reunião marcada para sexta-feira às 15h",
    timestamp: new Date().toISOString(),
    userId: "user_123",
    category: "fact",
    keywords: ["reunião", "sexta-feira", "15h"],
  });

  console.log("  🔍 Buscando por 'api'...");
  const searchApi = memory.layers.longTerm.search("api", 3);
  console.log(`  ✅ Resultados encontrados: ${searchApi.length}`);
  console.log(`  ✅ Contém 'deploy': ${searchApi[0]?.text.includes("deploy") ? "SIM ✅" : "NÃO ❌"}`);

  console.log("\n  🔍 Buscando por 'joão'...");
  const searchJoao = memory.layers.longTerm.search("joão", 3);
  console.log(`  ✅ Resultados encontrados: ${searchJoao.length}`);
  console.log(`  ✅ Contém 'emails': ${searchJoao[0]?.text.includes("emails") ? "SIM ✅" : "NÃO ❌"}`);

  console.log("\n  🔍 Buscando por 'reunião sexta'...");
  const searchReuniao = memory.layers.longTerm.search("reunião sexta", 3);
  console.log(`  ✅ Resultados encontrados: ${searchReuniao.length}`);
  console.log(`  ✅ Categoria correta: ${searchReuniao[0]?.category === "fact" ? "SIM ✅" : "NÃO ❌"}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 4: Context building
  console.log("📝 TESTE 4: Build context unificado\n");

  memory.addMessage("context_thread", "Usuário: Oi!", false);
  memory.addMessage("context_thread", "Bot: Olá! Como posso ajudar?", false);
  memory.addMessage("context_thread", "Usuário: Me fale sobre deploy", false);

  const context = await memory.buildContext("context_thread", "me fale sobre deploy");
  console.log("  📄 Contexto gerado:\n");
  console.log(context.split("\n").map(l => `    ${l}`).join("\n"));

  console.log(`\n  ✅ Contém CONTEXTO RECENTE: ${context.includes("CONTEXTO RECENTE") ? "SIM ✅" : "NÃO ❌"}`);
  console.log(`  ✅ Contém CONVERSA ATUAL: ${context.includes("CONVERSA ATUAL") ? "SIM ✅" : "NÃO ❌"}`);
  console.log(`  ✅ Contém MEMÓRIAS RELEVANTES: ${context.includes("MEMÓRIAS RELEVANTES") ? "SIM ✅" : "NÃO ❌"}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 5: Estatísticas
  console.log("📝 TESTE 5: Estatísticas do sistema\n");

  const finalStats = memory.getStats();
  console.log("📊 Estatísticas finais:");
  console.log(JSON.stringify(finalStats, null, 2));

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("✅ Todos os testes concluídos!\n");
  console.log("Próximos passos:");
  console.log("1. Integrar MemorySystem com BrainOrchestrator");
  console.log("2. Implementar agentes especializados (STEP-04)");
  console.log("3. Adicionar embeddings para busca semântica (futuro)\n");
}

// Executar testes
runTests().catch(console.error);
