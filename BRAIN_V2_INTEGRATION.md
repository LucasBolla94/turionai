# Brain V2 - WhatsApp Integration Guide

**Versão:** V1.1.1 STEP-08
**Data:** 2026-02-06
**Status:** ✅ Integrado

## 📖 Visão Geral

O Brain System V2 está agora completamente integrado ao WhatsApp através do Migration Wrapper. O sistema decide automaticamente entre Brain V2 ou Legacy baseado na feature flag `TURION_USE_BRAIN_V2`.

## 🚀 Como Ativar

### Opção 1: Ativar globalmente (via .env)

```bash
# Adicionar no arquivo .env
TURION_USE_BRAIN_V2=true
ANTHROPIC_API_KEY=sk-ant-api-03-...
```

### Opção 2: Ativar temporariamente (teste)

```bash
# Linux/Mac
TURION_USE_BRAIN_V2=true npm run dev

# Windows PowerShell
$env:TURION_USE_BRAIN_V2="true"; npm run dev
```

### Opção 3: Ativar via Feature Flags Manager (por usuário)

```typescript
import { FeatureFlagManager } from "./featureFlags";

const flags = new FeatureFlagManager();
await flags.initialize();

// Ativar apenas para um usuário específico
await flags.setUserOverride("brain_v2", "5511999999999", true, "admin");
```

## 🔄 Fluxo de Processamento

```
┌────────────────────────────────────────────────────┐
│         WhatsApp Message Received                  │
└────────────────┬───────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────┐
│         Message Classification                     │
│  (classifyMessage → COMMAND ou GENERAL)            │
└────────────────┬───────────────────────────────────┘
                 │
         ┌───────┴────────┐
         │                │
         ▼                ▼
    COMMAND           GENERAL
         │                │
         ▼                ▼
  handleCommand   processBrainMessage()
                          │
                 ┌────────┴─────────┐
                 │                  │
          Brain V2 ✅        Brain Legacy
         (if flag=true)     (if flag=false
                            or V2 error)
                 │                  │
                 ▼                  ▼
         ┌─────────────┐   ┌──────────────┐
         │ Orchestrator│   │ handleBrain  │
         │ → Agents    │   │ (Legacy)     │
         │ → Memory    │   │              │
         │ → Actions   │   │              │
         └──────┬──────┘   └──────┬───────┘
                │                  │
                └──────────┬───────┘
                           │
                           ▼
                   Send Response
```

## 📦 Componentes Integrados

### 1. Migration Wrapper
- **Arquivo:** `src/brain/migrationWrapper.ts`
- **Função:** `processBrainMessage()`
- **Responsabilidade:** Decide entre Brain V2 ou Legacy

### 2. Brain Orchestrator
- **Arquivo:** `src/brain/orchestrator.ts`
- **Função:** Classifica intent e delega para agentes
- **Agentes disponíveis:** ChatAgent, CronAgent

### 3. Memory System
- **Arquivo:** `src/brain/memory/`
- **Camadas:** Short-term, Session, Long-term
- **Contexto:** Automático em cada mensagem

### 4. Action Executor
- **Arquivo:** `src/brain/actionExecutor.ts`
- **Actions:** cron.create (✅), email.send (⏳), script.run (⏳)

### 5. Feature Flags
- **Arquivo:** `src/featureFlags/`
- **Controle:** Global, por usuário, via env

## 🧪 Testando a Integração

### Teste 1: Saudação (ChatAgent)

Envie no WhatsApp:
```
Oi! Como vai?
```

**Esperado (Brain V2):**
- Resposta com personalidade
- Tom informal e emoji
- Resposta rápida (5-10s)

**Log esperado:**
```
[Turion] Brain V2 processou a mensagem
[MigrationWrapper][V2] Resposta gerada (50 chars)
```

### Teste 2: Criar Lembrete (CronAgent)

Envie no WhatsApp:
```
Me lembra de fazer deploy às 18h
```

**Esperado (Brain V2):**
- Confirmação do lembrete
- CronJob criado
- Action executada

**Log esperado:**
```
[Turion] Brain V2 processou a mensagem
[MigrationWrapper][V2] Actions geradas: 1
[MigrationWrapper][V2] Action cron.create executada com sucesso
```

### Teste 3: Conversa com Contexto

Envie no WhatsApp (sequência):
```
1. Oi, tudo bem?
2. Me lembra de ligar pro João amanhã
3. O que eu tenho agendado?
```

**Esperado (Brain V2):**
- Mensagem 1: Saudação personalizada
- Mensagem 2: Confirma lembrete
- Mensagem 3: Lista o lembrete anterior (MEMÓRIA!)

### Teste 4: Sistema Legado (Flag OFF)

Desative a flag:
```bash
TURION_USE_BRAIN_V2=false
```

Envie qualquer mensagem:

**Esperado:**
- Sistema legado processa
- `handleBrain()` é chamado
- Comportamento anterior mantido

## 📊 Monitoramento

### Logs do Brain V2

```bash
# Ver se Brain V2 está ativo
grep "Brain V2" logs/turion.log

# Ver processamento de mensagens
grep "MigrationWrapper" logs/turion.log

# Ver actions executadas
grep "Action.*executada" logs/turion.log
```

### Estatísticas

```typescript
import { getBrainSystemStats } from "./brain/migrationWrapper";

const stats = getBrainSystemStats();
console.log(stats);
// {
//   active: "brain_v2",
//   initialized: true,
//   orchestrator: { agents: 2, agentNames: ["chat", "cron"] },
//   memory: { ... }
// }
```

## 🔧 Troubleshooting

### Problema: Brain V2 não está sendo usado

**Solução:**
1. Verificar se flag está ativa: `echo $TURION_USE_BRAIN_V2`
2. Verificar se ANTHROPIC_API_KEY está definida
3. Ver logs: `grep "Sistema ativo" logs/turion.log`

### Problema: Erro ao processar mensagem

**Solução:**
1. Brain V2 faz fallback automático para Legacy
2. Ver logs de erro: `grep "erro no brain" logs/turion.log`
3. Desativar Brain V2 temporariamente se necessário

### Problema: Lembrete não foi criado

**Solução:**
1. Verificar logs do Action Executor
2. Verificar se CronAgent foi ativado
3. Ver: `grep "ActionExecutor" logs/turion.log`

## 🎯 Diferenças Brain V2 vs Legacy

| Feature | Brain V2 | Legacy |
|---------|----------|--------|
| **Personalidade** | ✅ Agentes especializados | ❌ Genérico |
| **Memória** | ✅ 3 camadas | ⏳ Limitado |
| **Contexto** | ✅ Automático | ❌ Manual |
| **Actions** | ✅ Estruturado | ⏳ Direto |
| **Agentes** | ✅ Chat, Cron | ❌ Não tem |
| **Fallback** | ✅ Automático | N/A |

## 📈 Performance

- **Brain V2:** ~5-10s por mensagem (com Claude API)
- **Legacy:** ~2-5s por mensagem
- **Memória:** ~100ms adicional (3 camadas)
- **Action Executor:** ~50ms adicional

## 🚦 Rollback

Se houver problemas, desative o Brain V2:

```bash
# Via .env
TURION_USE_BRAIN_V2=false

# Ou remova a variável
unset TURION_USE_BRAIN_V2

# Restart
npm run dev
```

O sistema volta automaticamente para o comportamento legado.

## 🔮 Próximos Passos

1. **STEP-09:** Script Safety Analyzer
2. **STEP-10:** Script Categorization
3. **STEP-11:** ScriptAgent Base
4. **STEP-12:** Auto-Approval Logic

## 📞 Suporte

- **Documentação:** `Updates.md`
- **Roadmap:** `roadmap-v1.1.1.md`
- **Issues:** GitHub Issues com tag `[brain-v2]`
