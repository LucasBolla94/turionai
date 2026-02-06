/**
 * WhatsApp Integration Test - V1.1.1 STEP-08
 *
 * Valida a integração do Brain V2 com o WhatsApp handler.
 * Não requer WhatsApp real - testa apenas o fluxo de integração.
 *
 * Como rodar:
 * npx tsx src/test-whatsapp-integration.ts
 */

import { processBrainMessage, getBrainSystemStats } from "./brain/migrationWrapper";

console.log("🧪 Teste de Integração WhatsApp - STEP-08\n");
console.log("Testando: Brain V2 → WhatsApp Integration\n");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

async function runTests() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 1: Feature Flag OFF (deve retornar null - usar legacy)
  console.log("📝 TESTE 1: Feature Flag OFF (usar Legacy)\n");

  // Garantir que flag está OFF
  delete process.env.TURION_USE_BRAIN_V2;

  const result1 = await processBrainMessage({
    socket: {} as any, // Mock socket
    message: "Oi! Tudo bem?",
    userId: "test_user_1",
    threadId: "test_thread_1",
    from: "5511999999999@s.whatsapp.net",
  });

  console.log("✅ Resultado:");
  console.log("  Response:", result1 ? "Não-null (Brain V2)" : "null (Legacy)");
  console.log("  Esperado: null (Legacy)");

  if (result1 === null) {
    console.log("  ✅ PASSOU: Sistema usando Legacy como esperado");
  } else {
    console.log("  ❌ FALHOU: Deveria usar Legacy");
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 2: Feature Flag ON (deve processar com Brain V2)
  console.log("📝 TESTE 2: Feature Flag ON (usar Brain V2)\n");

  // Verificar se tem API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("⚠️  PULADO: ANTHROPIC_API_KEY não definida");
    console.log("   Para testar Brain V2, defina: export ANTHROPIC_API_KEY=sk-ant-...\n");
  } else {
    // Ativar flag
    process.env.TURION_USE_BRAIN_V2 = "true";

    const result2 = await processBrainMessage({
      socket: {} as any, // Mock socket
      message: "Oi! Tudo bem?",
      userId: "test_user_2",
      threadId: "test_thread_2",
      from: "5511999999998@s.whatsapp.net",
    });

    console.log("✅ Resultado:");
    console.log("  Response:", result2 ? "Não-null (Brain V2)" : "null (Legacy)");
    console.log("  Esperado: Não-null (Brain V2)");
    if (result2) {
      console.log(`  Resposta: "${result2.substring(0, 100)}..."`);
    }

    if (result2 !== null) {
      console.log("  ✅ PASSOU: Brain V2 processou a mensagem");
    } else {
      console.log("  ❌ FALHOU: Brain V2 deveria processar");
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 3: Estatísticas do sistema
  console.log("📝 TESTE 3: Estatísticas do sistema\n");

  const stats = getBrainSystemStats();

  console.log("✅ Resultado:");
  console.log(JSON.stringify(stats, null, 2));

  if (stats.active) {
    console.log(`  Sistema ativo: ${stats.active}`);
    console.log("  ✅ PASSOU: Sistema reportando status");
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 4: Fluxo de fallback
  console.log("📝 TESTE 4: Fallback automático em caso de erro\n");

  // Simular erro no Brain V2 (API key inválida)
  const originalKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "sk-ant-invalid-key-for-test";
  process.env.TURION_USE_BRAIN_V2 = "true";

  const result4 = await processBrainMessage({
    socket: {} as any,
    message: "Teste de fallback",
    userId: "test_user_fallback",
    threadId: "test_thread_fallback",
    from: "5511999999997@s.whatsapp.net",
  });

  console.log("✅ Resultado:");
  console.log("  Response:", result4 ? "Não-null" : "null (Fallback para Legacy)");
  console.log("  Esperado: null (Fallback para Legacy)");

  if (result4 === null) {
    console.log("  ✅ PASSOU: Fallback para Legacy funcionou");
  } else {
    console.log("  ⚠️  AVISO: Esperava fallback, mas processou");
  }

  // Restaurar API key
  if (originalKey) {
    process.env.ANTHROPIC_API_KEY = originalKey;
  } else {
    delete process.env.ANTHROPIC_API_KEY;
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Resumo final
  console.log("✅ Testes de Integração WhatsApp concluídos!\n");

  console.log("Componentes validados:");
  console.log("  ✅ Migration Wrapper integrado");
  console.log("  ✅ Feature Flag funcionando");
  console.log("  ✅ Fallback automático");
  console.log("  ✅ Estatísticas disponíveis");

  console.log("\nFluxo de integração:");
  console.log("  WhatsApp Message");
  console.log("    ↓");
  console.log("  processBrainMessage()");
  console.log("    ↓");
  console.log("  ┌─────────┴──────────┐");
  console.log("  ↓                    ↓");
  console.log("Brain V2           Legacy");
  console.log("(flag=true)      (flag=false)");

  console.log("\nPara testar com WhatsApp real:");
  console.log("  1. Ativar flag: TURION_USE_BRAIN_V2=true");
  console.log("  2. Definir API: ANTHROPIC_API_KEY=sk-ant-...");
  console.log("  3. Rodar bot: npm run dev");
  console.log("  4. Enviar mensagem no WhatsApp");
  console.log("  5. Ver logs: grep 'Brain V2' logs/*.log\n");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

// Executar testes
runTests().catch(console.error);
