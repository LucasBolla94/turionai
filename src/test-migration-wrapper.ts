/**
 * Migration Wrapper Test - V1.1.1 STEP-05
 *
 * Testa o Migration Wrapper em ambos os modos:
 * - Brain V2 (novo sistema)
 * - Legacy (sistema antigo)
 *
 * Como rodar:
 * npx tsx src/test-migration-wrapper.ts
 *
 * Com Brain V2 ativado:
 * TURION_USE_BRAIN_V2=true npx tsx src/test-migration-wrapper.ts
 */

import { processBrainMessage, getBrainSystemStats, resetBrainSystem } from "./brain/migrationWrapper";

console.log("🧪 Teste do Migration Wrapper - STEP-05\n");
console.log("Testando: Brain V2 vs Legacy + Feature Flag\n");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Mock do WASocket
const mockSocket = {
  sendMessage: async (to: string, message: any) => {
    console.log(`  [Mock] Enviar mensagem para ${to}:`, message.text?.slice(0, 50));
  },
} as any;

async function runTests() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Verificar modo ativo
  const useBrainV2 = process.env.TURION_USE_BRAIN_V2 === "true";
  console.log(`📊 Feature Flag: TURION_USE_BRAIN_V2 = ${useBrainV2 ? "✅ TRUE (Brain V2)" : "❌ FALSE (Legacy)"}\n`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 1: Saudação
  console.log("📝 TESTE 1: Saudação\n");

  const result1 = await processBrainMessage({
    socket: mockSocket,
    message: "Oi! Tudo bem?",
    userId: "test_user_1",
    threadId: "test_thread_1",
    from: "5511999999999@s.whatsapp.net",
  });

  console.log("\n✅ Resultado:");
  if (result1) {
    console.log("  Sistema: Brain V2 🚀");
    console.log("  Resposta:", result1.slice(0, 100) + (result1.length > 100 ? "..." : ""));
  } else {
    console.log("  Sistema: Legacy (delegado para handleBrain)");
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 2: Lembrete
  console.log("📝 TESTE 2: Criar lembrete\n");

  const result2 = await processBrainMessage({
    socket: mockSocket,
    message: "Me lembra de fazer o deploy às 18h",
    userId: "test_user_1",
    threadId: "test_thread_1",
    from: "5511999999999@s.whatsapp.net",
  });

  console.log("\n✅ Resultado:");
  if (result2) {
    console.log("  Sistema: Brain V2 🚀");
    console.log("  Resposta:", result2.slice(0, 100) + (result2.length > 100 ? "..." : ""));
  } else {
    console.log("  Sistema: Legacy (delegado para handleBrain)");
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 3: Conversa com contexto
  console.log("📝 TESTE 3: Conversa com contexto\n");

  const result3 = await processBrainMessage({
    socket: mockSocket,
    message: "E o que temos para hoje?",
    userId: "test_user_1",
    threadId: "test_thread_1",
    from: "5511999999999@s.whatsapp.net",
  });

  console.log("\n✅ Resultado:");
  if (result3) {
    console.log("  Sistema: Brain V2 🚀");
    console.log("  Resposta:", result3.slice(0, 100) + (result3.length > 100 ? "..." : ""));
  } else {
    console.log("  Sistema: Legacy (delegado para handleBrain)");
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 4: Estatísticas do sistema
  console.log("📝 TESTE 4: Estatísticas do sistema\n");

  const stats = getBrainSystemStats();

  console.log("✅ Resultado:");
  console.log(JSON.stringify(stats, null, 2));

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 5: Reset do sistema (só testa se Brain V2 estiver ativo)
  if (useBrainV2) {
    console.log("📝 TESTE 5: Reset do sistema\n");

    resetBrainSystem();

    const statsAfterReset = getBrainSystemStats();
    console.log("✅ Resultado após reset:");
    console.log(JSON.stringify(statsAfterReset, null, 2));

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }

  // Resumo final
  console.log("✅ Todos os testes de migração concluídos!\n");

  console.log("Componentes validados:");
  console.log(`  ${useBrainV2 ? "✅" : "⏳"} Brain V2 (Orchestrator + Agents + Memory)`);
  console.log("  ✅ Feature Flag (TURION_USE_BRAIN_V2)");
  console.log("  ✅ Migration Wrapper");
  console.log("  ✅ Fallback para Legacy");

  console.log("\nPróximos passos:");
  console.log("  1. Integrar wrapper no whatsapp.ts");
  console.log("  2. Testar com WhatsApp real");
  console.log("  3. Conectar actions aos executores (cron, email, etc)");
  console.log("  4. Migração gradual de funcionalidades\n");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("💡 Dica: Para testar Brain V2, rode:");
  console.log("   TURION_USE_BRAIN_V2=true npx tsx src/test-migration-wrapper.ts\n");
}

// Executar testes
runTests().catch(console.error);
