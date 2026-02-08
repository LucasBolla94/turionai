# Turion - Resumo para AI Context

**Leia este arquivo primeiro.** Ele contem tudo que voce precisa para entender o projeto e continuar o desenvolvimento.

---

## O QUE E

Turion e um assistente pessoal via WhatsApp. Roda 24/7 em servidor Linux via Docker.
O usuario manda mensagem no WhatsApp, o Turion interpreta com Claude (Anthropic) e responde.

## STACK

- **Runtime:** Node.js 20 (Alpine Linux, Docker)
- **IA:** Anthropic Claude (`claude-sonnet-4-5-20250929`) - provider unico
- **WhatsApp:** Baileys library
- **Deploy:** Docker + Docker Compose
- **Dados:** JSON/JSONL no filesystem (sem banco de dados)
- **Linguagem:** TypeScript compilado para JS

## COMO FUNCIONA

```
Usuario envia msg no WhatsApp
  -> src/channels/whatsapp.ts (handler principal, ~3500 linhas)
    -> Se nao tem dono: fluxo de onboarding (PIN -> API key -> nome -> cidade)
    -> Se tem dono: processBrainMessage()
      -> Se TURION_USE_BRAIN_V2=true:
        -> src/brain/orchestrator.ts (classifica intent com Claude)
        -> src/brain/agents/ (chatAgent, cronAgent executam)
        -> src/brain/memory/ (3 camadas: RAM, sessao, longo prazo)
      -> Se false ou erro: fallback para src/core/brain.ts (legado)
  -> Resposta enviada de volta no WhatsApp
```

## ARQUITETURA

```
src/
  channels/whatsapp.ts     -- Handler principal WhatsApp
  core/
    brain.ts               -- Chamadas Anthropic (legado)
    owner.ts               -- Estado do dono (PIN, pairing)
    pendingActions.ts       -- State machine onboarding
    env.ts                 -- Loader .env resiliente
    cronManager.ts         -- Cron jobs
    auditLog.ts            -- Audit basico JSONL
  brain/
    orchestrator.ts        -- Classifica intents, delega para agentes
    migrationWrapper.ts    -- Bridge legado <-> Brain V2
    actionExecutor.ts      -- Executa actions dos agentes
    types.ts               -- Interfaces compartilhadas
    agents/
      baseAgent.ts         -- Classe abstrata (callClaude, canHandle, execute)
      chatAgent.ts         -- Conversa casual
      cronAgent.ts         -- Lembretes/agendamentos
    memory/
      memorySystem.ts      -- Unifica 3 camadas
      shortTermMemory.ts   -- RAM, ultimas 10 msgs
      sessionMemory.ts     -- JSON por thread
      longTermMemory.ts    -- JSON com busca keyword
  gateway/
    messageGateway.ts      -- Abstrai canais de comunicacao
    adapters/whatsappAdapter.ts
  skills/                  -- Sistema legado de execucao
    scriptSkill.ts, emailSkill.ts, logsSkill.ts, cronSkill.ts
  executor/
    executor.ts            -- Executa scripts shell (legado)
  featureFlags/
    featureFlagManager.ts  -- Feature flags por usuario
```

## COMO ADICIONAR UM AGENTE

1. Criar arquivo em `src/brain/agents/nomeAgent.ts`
2. Herdar de `BaseAgent`
3. Implementar: `name`, `description`, `canHandle(intent)`, `execute(params)`
4. Registrar em `src/brain/migrationWrapper.ts` no `initializeBrainV2()`
5. Se o agente gera actions, implementar handler em `src/brain/actionExecutor.ts`

## FLUXO DE INSTALACAO

```
curl install.sh | sudo bash
  -> Instala Docker, clona repo, cria .env vazio
  -> docker compose build && up
  -> Mostra QR Code + PIN de 4 digitos
  -> Usuario escaneia QR, envia PIN no WhatsApp
  -> Onboarding: API key -> nome bot -> nome user -> cidade -> pronto
```

## PROGRESSO

### Fase 1 - Fundacao: 100% COMPLETA (8/8 steps)
- Gateway, Orchestrator, Memory, BaseAgent, ChatAgent, MigrationWrapper, FeatureFlags, Testes

### Fase 2 - Autonomia: EM DESENVOLVIMENTO (0/5 steps)
O sistema aprende automaticamente quais comandos sao seguros baseado no uso.

- **Step 09: CommandLearner** ⬜ - Registra comandos e calcula trust score (0-100)
  - Arquivo: `src/brain/autonomy/commandLearner.ts`
  - Dados: `state/autonomy/command-profiles.json`

- **Step 10: TrustEngine** ⬜ - 3 niveis de confianca
  - VERDE (>=80): auto-executa
  - AMARELO (40-79): pede confirmacao rapida
  - VERMELHO (<40 ou destrutivo): pede autorizacao
  - Arquivo: `src/brain/autonomy/trustEngine.ts`

- **Step 11: ScriptAgent** ⬜ - Subagente que executa comandos
  - Usa TrustEngine para decidir o que fazer
  - Arquivo: `src/brain/agents/scriptAgent.ts`

- **Step 12: AuditTrail** ⬜ - Registra tudo em JSONL
  - Arquivo: `src/brain/autonomy/auditTrail.ts`

- **Step 13: Integracao** ⬜ - Conectar tudo + testes + build

### Fase 3 - Inteligencia: NAO INICIADA
- Embeddings, LogsAgent, GitAgent, Analytics, Self-Improvement

### Fase 4 - Polish: NAO INICIADA
- Conversation Repair, Response Optimization, Performance

## DECISOES TECNICAS

1. Provider unico Anthropic (migrado de XAI/Grok)
2. Sem banco de dados - tudo JSON/JSONL
3. Docker non-root (user turion UID 1001)
4. docker-entrypoint.sh roda como root, fixa permissoes, desce para turion via su-exec
5. env.ts com try-catch (nao crasha se .env nao legivel)
6. Setup via WhatsApp com PIN de 4 digitos
7. Mensagens sempre humanizadas (nunca roboticas)
8. Feature flag TURION_USE_BRAIN_V2 controla qual sistema usar

## DOCUMENTACAO DETALHADA

- `Status-V1.1.1.md` - Status completo com detalhes de cada step
- `BRAIN_V2_INTEGRATION.md` - Guia do Brain System V2
- `Updates.md` - Historico de atualizacoes
- `V1.1.1.md` - Arquitetura tecnica detalhada
- `roadmap-v1.1.1.md` - Roadmap de features

## BUGS JA RESOLVIDOS

1. .dockerignore excluia package-lock.json
2. Brain usava XAI/Grok (migrado para Anthropic)
3. Loop de erro 401 (polish: false + deteccao auth error)
4. .env EACCES permission denied (docker-entrypoint.sh + try-catch)
5. Setup nao iniciava (estado anterior persistia)
6. API key interceptada por parseApiStatusRequest
7. Logs nao saiam automaticamente apos conectar WhatsApp
