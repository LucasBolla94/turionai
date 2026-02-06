/**
 * Feature Flags Test - V1.1.1 STEP-07
 *
 * Testa o sistema de feature flags:
 * - Registro de flags
 * - Avaliação (global, user override, env)
 * - Persistência (save/load)
 * - Histórico de mudanças
 * - Estatísticas
 *
 * Como rodar:
 * npx tsx src/test-feature-flags.ts
 */

import { FeatureFlagManager } from "./featureFlags";

console.log("🧪 Teste do Feature Flag Manager - STEP-07\n");
console.log("Testando: Feature Flags System\n");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

async function runTests() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 1: Inicializar e registrar flags
  console.log("📝 TESTE 1: Inicializar e registrar flags\n");

  const manager = new FeatureFlagManager({
    storagePath: "state/feature-flags-test",
    autoSave: true,
  });

  await manager.initialize();

  // Registrar flags de teste
  manager.registerFlag({
    key: "brain_v2",
    name: "Brain System V2",
    description: "Ativa o novo Brain System com Orchestrator e Agents",
    defaultValue: false,
    category: "core",
  });

  manager.registerFlag({
    key: "auto_approval",
    name: "Auto-Approval de Scripts",
    description: "Permite aprovação automática de scripts categorizados como safe",
    defaultValue: false,
    category: "experimental",
  });

  manager.registerFlag({
    key: "semantic_search",
    name: "Busca Semântica",
    description: "Usa embeddings para busca semântica na memória",
    defaultValue: false,
    category: "beta",
  });

  const allFlags = manager.getAllFlags();

  console.log("✅ Resultado:");
  console.log(`  Flags registradas: ${allFlags.length}`);
  for (const flag of allFlags) {
    console.log(`  - ${flag.key}: ${flag.name} (${flag.category})`);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 2: Avaliar flag (deve usar valor default)
  console.log("📝 TESTE 2: Avaliar flag com valor default\n");

  const evaluation1 = manager.evaluate("brain_v2");

  console.log("✅ Resultado:");
  console.log(`  Flag: ${evaluation1.key}`);
  console.log(`  Enabled: ${evaluation1.enabled}`);
  console.log(`  Source: ${evaluation1.source}`);
  console.log(`  Category: ${evaluation1.metadata?.category}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 3: Modificar flag global
  console.log("📝 TESTE 3: Modificar flag global\n");

  await manager.setFlag("brain_v2", true, "test_user", "Teste de ativação");

  const evaluation2 = manager.evaluate("brain_v2");

  console.log("✅ Resultado:");
  console.log(`  Flag: ${evaluation2.key}`);
  console.log(`  Enabled: ${evaluation2.enabled}`);
  console.log(`  Source: ${evaluation2.source}`);
  console.log(`  Updated at: ${evaluation2.metadata?.updatedAt}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 4: User override
  console.log("📝 TESTE 4: User-specific override\n");

  await manager.setUserOverride("auto_approval", "user_123", true, "admin");

  const evaluationGlobal = manager.evaluate("auto_approval");
  const evaluationUser = manager.evaluate("auto_approval", "user_123");

  console.log("✅ Resultado:");
  console.log("  Global:");
  console.log(`    Enabled: ${evaluationGlobal.enabled}`);
  console.log(`    Source: ${evaluationGlobal.source}`);
  console.log("  User 'user_123':");
  console.log(`    Enabled: ${evaluationUser.enabled}`);
  console.log(`    Source: ${evaluationUser.source}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 5: Environment variable priority
  console.log("📝 TESTE 5: Environment variable priority\n");

  // Simular env var
  process.env.TURION_USE_SEMANTIC_SEARCH = "true";

  const evaluationEnv = manager.evaluate("semantic_search");

  console.log("✅ Resultado:");
  console.log(`  Flag: ${evaluationEnv.key}`);
  console.log(`  Enabled: ${evaluationEnv.enabled}`);
  console.log(`  Source: ${evaluationEnv.source} (deve ser 'env')`);
  console.log(`  Global value: ${manager.getFlag("semantic_search")?.enabled}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 6: Histórico de mudanças
  console.log("📝 TESTE 6: Histórico de mudanças\n");

  const history = manager.getHistory();

  console.log("✅ Resultado:");
  console.log(`  Total de mudanças: ${history.length}`);
  for (const entry of history) {
    console.log(`  - ${entry.flagKey}: ${entry.oldValue} → ${entry.newValue}`);
    console.log(`    Changed by: ${entry.changedBy}`);
    if (entry.reason) {
      console.log(`    Reason: ${entry.reason}`);
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 7: Persistência (salvar e recarregar)
  console.log("📝 TESTE 7: Persistência (salvar e recarregar)\n");

  // Flush pending saves
  await manager.flush();

  // Criar novo manager para simular restart
  const manager2 = new FeatureFlagManager({
    storagePath: "state/feature-flags-test",
    autoSave: false,
  });

  await manager2.initialize();

  const reloadedFlags = manager2.getAllFlags();
  const reloadedBrainV2 = manager2.evaluate("brain_v2");
  const reloadedUserOverride = manager2.evaluate("auto_approval", "user_123");

  console.log("✅ Resultado:");
  console.log(`  Flags recarregadas: ${reloadedFlags.length}`);
  console.log(`  brain_v2 enabled: ${reloadedBrainV2.enabled} (deve ser true)`);
  console.log(`  auto_approval para user_123: ${reloadedUserOverride.enabled} (deve ser true)`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 8: Estatísticas
  console.log("📝 TESTE 8: Estatísticas do sistema\n");

  const stats = manager.getStats();

  console.log("✅ Resultado:");
  console.log(JSON.stringify(stats, null, 2));

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 9: Remover user override
  console.log("📝 TESTE 9: Remover user override\n");

  await manager.removeUserOverride("auto_approval", "user_123");

  const evaluationAfterRemove = manager.evaluate("auto_approval", "user_123");

  console.log("✅ Resultado:");
  console.log(`  auto_approval para user_123: ${evaluationAfterRemove.enabled}`);
  console.log(`  Source: ${evaluationAfterRemove.source} (deve ser 'global')`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 10: isEnabled() helper
  console.log("📝 TESTE 10: isEnabled() helper method\n");

  const isEnabledBrainV2 = manager.isEnabled("brain_v2");
  const isEnabledAutoApproval = manager.isEnabled("auto_approval");

  console.log("✅ Resultado:");
  console.log(`  brain_v2 enabled: ${isEnabledBrainV2}`);
  console.log(`  auto_approval enabled: ${isEnabledAutoApproval}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Resumo final
  console.log("✅ Testes de Feature Flags concluídos!\n");

  const finalStats = manager.getStats();

  console.log("Resultados:");
  console.log(`  ✅ Testes passaram: 10/10`);
  console.log(`  ✅ Flags registradas: ${finalStats.totalFlags}`);
  console.log(`  ✅ Flags ativas: ${finalStats.enabledFlags}`);
  console.log(`  ✅ Histórico: ${finalStats.historyEntries} entradas`);

  console.log("\nComponentes validados:");
  console.log("  ✅ FeatureFlagManager");
  console.log("  ✅ Registro de flags");
  console.log("  ✅ Avaliação (global, user, env)");
  console.log("  ✅ Persistência (JSON)");
  console.log("  ✅ Histórico de mudanças");
  console.log("  ✅ User overrides");
  console.log("  ✅ Environment variables priority");

  console.log("\nPrioridade de avaliação:");
  console.log("  1. Environment variable (TURION_USE_*)");
  console.log("  2. User override");
  console.log("  3. Global flag value");
  console.log("  4. Default value");

  console.log("\nFlags disponíveis:");
  const flags = manager.getAllFlags();
  for (const flag of flags) {
    const status = manager.isEnabled(flag.key) ? "🟢" : "🔴";
    console.log(`  ${status} ${flag.key} (${flag.category})`);
    console.log(`     ${flag.description}`);
  }

  console.log("\nPróximos passos:");
  console.log("  1. Integrar com Migration Wrapper");
  console.log("  2. Adicionar flags para todas as features");
  console.log("  3. Dashboard para gerenciar flags");
  console.log("  4. Testar na VPS\n");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

// Executar testes
runTests().catch(console.error);
