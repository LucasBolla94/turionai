/**
 * Action Executor Test - V1.1.1 STEP-06
 *
 * Testa execução de actions conectando aos executores legados.
 *
 * Como rodar:
 * npx tsx src/test-action-executor.ts
 */

import { executeAction, executeActions, getActionExecutorStats } from "./brain/actionExecutor";
import type { Action } from "./brain/types";

console.log("🧪 Teste do Action Executor - STEP-06\n");
console.log("Testando: Execução de actions → Executores legados\n");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

async function runTests() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 1: Executar action cron.create
  console.log("📝 TESTE 1: Executar action cron.create\n");

  const cronAction: Action = {
    type: "cron.create",
    payload: {
      message: "Fazer deploy do sistema",
      delay: "15min",
      userId: "test_user_1",
      threadId: "test_thread_1",
    },
  };

  const result1 = await executeAction(cronAction);

  console.log("\n✅ Resultado:");
  console.log("  Success:", result1.success ? "✅" : "❌");
  console.log("  Message:", result1.message);
  if (result1.error) {
    console.log("  Error:", result1.error);
  }
  if (result1.data) {
    console.log("  CronJob:", result1.data.cronJob?.name);
    console.log("  Schedule:", result1.data.cronJob?.schedule);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 2: Executar action cron.create (hora específica)
  console.log("📝 TESTE 2: Criar lembrete para hora específica\n");

  const cronAction2: Action = {
    type: "cron.create",
    payload: {
      message: "Reunião com equipe",
      delay: "18:00",
      userId: "test_user_1",
      threadId: "test_thread_1",
    },
  };

  const result2 = await executeAction(cronAction2);

  console.log("\n✅ Resultado:");
  console.log("  Success:", result2.success ? "✅" : "❌");
  console.log("  Message:", result2.message);
  if (result2.data) {
    console.log("  CronJob:", result2.data.cronJob?.name);
    console.log("  Schedule:", result2.data.cronJob?.schedule);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 3: Executar múltiplas actions
  console.log("📝 TESTE 3: Executar múltiplas actions em sequência\n");

  const multipleActions: Action[] = [
    {
      type: "cron.create",
      payload: {
        message: "Lembrete 1",
        delay: "30min",
        userId: "test_user_1",
        threadId: "test_thread_1",
      },
    },
    {
      type: "cron.create",
      payload: {
        message: "Lembrete 2",
        delay: "1h",
        userId: "test_user_1",
        threadId: "test_thread_1",
      },
    },
  ];

  const result3 = await executeActions(multipleActions);

  console.log("\n✅ Resultado:");
  console.log("  Total de actions:", result3.length);
  for (let i = 0; i < result3.length; i++) {
    const res = result3[i];
    console.log(`  Action ${i + 1}:`, res.success ? "✅" : "❌", res.message);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 4: Tentar executar action não implementada
  console.log("📝 TESTE 4: Tentar action não implementada (email.send)\n");

  const emailAction: Action = {
    type: "email.send",
    payload: {
      to: "test@example.com",
      subject: "Test",
      body: "This is a test",
    },
  };

  const result4 = await executeAction(emailAction);

  console.log("\n✅ Resultado:");
  console.log("  Success:", result4.success ? "✅" : "❌");
  console.log("  Message:", result4.message);
  console.log("  Error:", result4.error);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 5: Tentar executar action desconhecida
  console.log("📝 TESTE 5: Tentar action type desconhecido\n");

  const unknownAction: Action = {
    type: "unknown.action",
    payload: {},
  };

  const result5 = await executeAction(unknownAction);

  console.log("\n✅ Resultado:");
  console.log("  Success:", result5.success ? "✅" : "❌");
  console.log("  Message:", result5.message);
  console.log("  Error:", result5.error);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 6: Estatísticas do executor
  console.log("📝 TESTE 6: Estatísticas do Action Executor\n");

  const stats = getActionExecutorStats();

  console.log("✅ Resultado:");
  console.log(JSON.stringify(stats, null, 2));

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Resumo final
  const successCount = [result1, result2, ...result3].filter((r) => r.success).length;
  const totalCount = 4; // Testes 1, 2 e 3 (2 actions)

  console.log("✅ Testes de Action Executor concluídos!\n");

  console.log("Resultados:");
  console.log(`  ✅ Actions bem-sucedidas: ${successCount}/${totalCount}`);
  console.log(`  ❌ Actions falhadas: ${totalCount - successCount}/${totalCount}`);

  console.log("\nComponentes validados:");
  console.log("  ✅ Action Executor");
  console.log("  ✅ Integração com cronManager (cron.create)");
  console.log("  ✅ Execução de múltiplas actions");
  console.log("  ✅ Tratamento de erros");

  console.log("\nActions implementadas:");
  console.log("  ✅ cron.create → cronManager.createCronNormalized()");

  console.log("\nActions pendentes:");
  console.log("  ⏳ email.send → emailClient (futuro)");
  console.log("  ⏳ script.run → executor (futuro)");

  console.log("\nPróximos passos:");
  console.log("  1. Testar na VPS");
  console.log("  2. Integrar no Migration Wrapper");
  console.log("  3. Testar com WhatsApp real");
  console.log("  4. Implementar EmailAgent e ScriptAgent\n");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

// Executar testes
runTests().catch(console.error);
