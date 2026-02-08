# Status Turion V1.1.1 - Documento Unificado para AI Context

**Atualizado:** 2026-02-07
**Versao:** 1.1.1
**Progresso Total:** ~38% (8/21 steps concluidos - Fase 1: 8/8, Fase 2: 0/5)

---

## O QUE E O TURION

Turion e um assistente pessoal via WhatsApp que roda 24/7 em um servidor Linux.
O usuario envia mensagens pelo WhatsApp e o Turion interpreta, executa acoes e responde.

**Stack:**
- Runtime: Node.js 20 (Alpine Linux via Docker)
- IA: Anthropic Claude (claude-sonnet-4-5-20250929) - provider unico
- WhatsApp: Baileys library
- Deploy: Docker + Docker Compose
- Armazenamento: JSON/JSONL local (sem banco de dados)
- Linguagem: TypeScript compilado para JS

---

## ARQUITETURA ATUAL (O que existe e funciona)

```
USUARIO (WhatsApp)
    |
    v
[src/channels/whatsapp.ts] -- Handler principal (~3500 linhas)
    |
    |-- Setup/Onboarding (PIN 4 digitos -> API key -> nome -> cidade -> confirmacao)
    |-- Owner management (src/core/owner.ts)
    |-- Pending actions state machine (src/core/pendingActions.ts)
    |
    |-- ROTA 1: Brain V2 (se TURION_USE_BRAIN_V2=true)
    |   |
    |   v
    |   [src/brain/migrationWrapper.ts]
    |       |
    |       v
    |   [src/brain/orchestrator.ts] -- Classifica intent com Claude
    |       |
    |       v
    |   [src/brain/agents/]
    |       |-- chatAgent.ts (conversa casual)
    |       |-- cronAgent.ts (lembretes/agendamentos)
    |       |-- baseAgent.ts (interface base)
    |       |
    |       v
    |   [src/brain/memory/]
    |       |-- shortTermMemory.ts (RAM, ultimas 10 msgs)
    |       |-- sessionMemory.ts (JSON, conversa atual)
    |       |-- longTermMemory.ts (JSON, busca por keyword)
    |       |-- memorySystem.ts (unifica as 3 camadas)
    |
    |-- ROTA 2: Legacy (fallback ou se flag=false)
    |   |
    |   v
    |   [src/core/brain.ts] -- callAnthropic() para todas as funcoes
    |       |-- interpretStrictJson() - classifica intent
    |       |-- buildReply() - gera resposta
    |       |-- polishReply() - refina resposta
    |       |-- extractFacts() - extrai fatos da conversa
    |       |-- interpretOnboardingAnswer() - setup
    |       |-- checkAiHealth() - verifica API
    |
    |-- Skills (sistema legado de execucao)
        |-- src/skills/scriptSkill.ts
        |-- src/skills/emailSkill.ts
        |-- src/skills/logsSkill.ts
        |-- src/skills/cronSkill.ts
```

---

## FLUXO DE INSTALACAO (Funcional)

```
curl -fsSL https://raw.githubusercontent.com/.../install.sh | sudo bash
    |
    v
1. Valida sistema (root, OS, disco, internet)
2. apt update && upgrade
3. Instala dependencias (git, curl, etc)
4. Instala Docker + Docker Compose
5. git clone para /opt/turion
6. Cria diretorios (state/, logs/, auth_info/)
7. Gera .env com valores vazios
8. Limpa estado anterior (owner.json, auth_info, pending.json)
9. docker compose build && up -d
10. Mostra QR Code + PIN de 4 digitos
11. Auto-exit quando WhatsApp conecta
    |
    v
USUARIO ESCANEIA QR + ENVIA PIN
    |
    v
SETUP VIA WHATSAPP:
  1. Envia PIN 4 digitos -> identifica como dono
  2. Pede ANTHROPIC_API_KEY (sk-ant-...)
  3. Pede nome do assistente
  4. Pede nome do usuario
  5. Pede cidade (infere timezone)
  6. Mostra resumo -> confirma
  7. Setup completo, bot funcional
```

---

## FASE 1 - FUNDACAO (100% COMPLETA)

### Step 01: Message Gateway ✅
- `src/gateway/messageGateway.ts` - Abstrai canais de comunicacao
- `src/gateway/types.ts` - Interfaces NormalizedMessage, MessageAdapter
- `src/gateway/adapters/whatsappAdapter.ts` - Adaptador WhatsApp
- Deduplicacao de mensagens com TTL de 5min

### Step 02: Brain Orchestrator ✅
- `src/brain/orchestrator.ts` - Classifica intents com Claude
- `src/brain/types.ts` - IntentClassification, ProcessRequest, ProcessResult
- Confidence scoring (>70% executa, <60% pede clarificacao)
- Delegacao para subagentes registrados

### Step 03: Memory System ✅
- `src/brain/memory/shortTermMemory.ts` - RAM, ultimas 10 msgs
- `src/brain/memory/sessionMemory.ts` - Persistente por thread (JSON)
- `src/brain/memory/longTermMemory.ts` - Busca por keywords (JSON)
- `src/brain/memory/memorySystem.ts` - Unifica 3 camadas + buildContext()

### Step 04: Base Agent Interface ✅
- `src/brain/agents/baseAgent.ts` - Classe abstrata com callClaude()
- Interface: name, description, canHandle(), execute()

### Step 05: ChatAgent ✅
- `src/brain/agents/chatAgent.ts` - Conversa casual com personalidade
- Usa sistema de memoria para contexto

### Step 06: Migration Wrapper ✅
- `src/brain/migrationWrapper.ts` - Transicao gradual Legacy -> Brain V2
- processBrainMessage() decide qual sistema usar
- Fallback automatico para Legacy se V2 falhar

### Step 07: Feature Flags ✅
- `src/featureFlags/featureFlagManager.ts` - Gerenciador centralizado
- `src/featureFlags/types.ts` - Tipos
- Override por usuario, historico de mudancas
- Flags: TURION_USE_BRAIN_V2, TURION_USE_GATEWAY, etc.

### Step 08: Integration Tests + WhatsApp Integration ✅
- 8 arquivos de teste (gateway, orchestrator, memory, flags, etc.)
- Brain V2 integrado ao handler WhatsApp via Migration Wrapper
- `BRAIN_V2_INTEGRATION.md` - Guia completo

---

## FASE 2 - AUTONOMIA (EM DESENVOLVIMENTO)

**Abordagem:** Sistema de aprendizado inteligente que classifica comandos automaticamente
baseado no comportamento do usuario, sem categorias pre-definidas. O bot aprende quais
comandos sao seguros conforme o usuario vai usando e confirmando.

### Step 09: CommandLearner - Sistema de Classificacao Auto-Learning ⬜
**Status:** NAO INICIADO
**Diretorio:** `src/brain/autonomy/commandLearner.ts`
**Persistencia:** `state/autonomy/command-profiles.json`

O que faz:
- Registra cada comando executado pelo usuario (tipo, frequencia, resultado)
- Calcula um "trust score" por tipo de comando (0-100)
- Quanto mais o usuario executa um comando com sucesso, maior o score
- Comandos novos/desconhecidos comecam com score 0 (sempre pedem confirmacao)
- Esquema de dados: { commandType, executionCount, successCount, failCount, lastUsed, trustScore }
- Funcoes: recordExecution(), getTrustScore(), getCommandProfile(), getAllProfiles()

### Step 10: TrustEngine - Sistema de Confianca 3 Niveis ⬜
**Status:** NAO INICIADO
**Diretorio:** `src/brain/autonomy/trustEngine.ts`
**Persistencia:** `state/autonomy/trust-config.json`

O que faz:
- 3 niveis de confianca baseados no trust score do CommandLearner:
  - VERDE (score >= 80): Auto-executa sem perguntar
  - AMARELO (score 40-79): Pede confirmacao rapida ("Posso executar X?")
  - VERMELHO (score < 40 ou comando destrutivo): Pede autorizacao detalhada
- Lista de keywords destrutivas que SEMPRE sao VERMELHO: rm -rf, drop, delete, format, shutdown, reboot
- O dono pode promover/rebaixar comandos manualmente ("sempre autorizar X", "sempre perguntar Y")
- Funcoes: evaluateCommand(), getLevel(), addToAlwaysAsk(), addToAlwaysAllow()

### Step 11: ScriptAgent - Subagente do Brain V2 ⬜
**Status:** NAO INICIADO
**Diretorio:** `src/brain/agents/scriptAgent.ts`

O que faz:
- Herda de BaseAgent (mesmo padrao do ChatAgent e CronAgent)
- Recebe intent "script"/"executar"/"rodar" do Orchestrator
- Usa TrustEngine para decidir se executa, pede confirmacao ou bloqueia
- Gera actions do tipo "script.run" para o ActionExecutor
- Mensagens sempre humanizadas:
  - VERDE: "Ja rodei o comando, aqui esta o resultado: ..."
  - AMARELO: "Esse comando eu ainda nao conhego bem. Posso executar '{cmd}'?"
  - VERMELHO: "Esse comando e sensivel. Tem certeza que quer executar '{cmd}'? Responde 'sim' pra confirmar."
- Registra resultado no CommandLearner apos execucao (sucesso/falha)

### Step 12: AuditTrail - Sistema de Auditoria Completo ⬜
**Status:** NAO INICIADO
**Diretorio:** `src/brain/autonomy/auditTrail.ts`
**Persistencia:** `state/autonomy/audit/YYYY-MM-DD.jsonl`

O que faz:
- Registra TUDO: comando pedido, nivel de confianca, se foi auto-aprovado ou confirmado, resultado, tempo de execucao
- Formato JSONL (uma linha JSON por entrada) para queries rapidas
- Funcoes de consulta: getRecent(n), getByDate(date), getByCommand(type), getStats()
- O usuario pode perguntar: "o que voce executou hoje?" e o bot responde com base no audit
- Integracao com CommandLearner para alimentar trust scores

### Step 13: Integracao + Testes + Polish ⬜
**Status:** NAO INICIADO

O que faz:
- Registrar ScriptAgent no BrainOrchestrator (migrationWrapper.ts)
- Implementar action handler "script.run" no ActionExecutor
- Fluxo de confirmacao via WhatsApp (pendingActions para AMARELO/VERMELHO)
- Todas as mensagens humanizadas (nao robticas)
- Build test: `npm run build` sem erros
- Testes unitarios para CommandLearner, TrustEngine, AuditTrail

### O que ja existe (legado, sera integrado):
- `src/skills/scriptSkill.ts` - Executa scripts (sem safety analysis)
- `src/executor/executor.ts` - Executor basico (runScript, listScripts)
- `src/core/auditLog.ts` - Audit basico em JSONL (sera substituido pelo AuditTrail)

---

## FASE 3 - INTELIGENCIA (NAO INICIADA)

### O que falta (Steps 17-24):
- **Embeddings** - Busca semantica (substituir keyword search)
- **LogsAgent** - Analisar logs com IA
- **GitAgent** - Operacoes git inteligentes
- **Analytics** - Detectar padroes de uso/erros
- **Self-Improvement** - Ajustar prompts baseado em falhas
- **Proactive Suggestions** - Sugerir acoes ao usuario

### O que ja existe (legado):
- `src/skills/logsSkill.ts` - Leitura basica de logs
- `src/core/githubState.ts` - Estado basico do GitHub
- `src/brain/memory/longTermMemory.ts` - Busca por keyword (sem embeddings)

---

## FASE 4 - POLISH (NAO INICIADA)

### O que falta (Steps 25-28):
- **Conversation Repair** - Clarificacao inteligente quando nao entende
- **Response Optimization** - Respostas mais naturais e rapidas
- **Performance Tuning** - Otimizacao de latencia
- **Final Tests + Launch** - Testes finais e lancamento

---

## ARQUIVOS CHAVE DO PROJETO

### Core (Sistema legado, funcional)
- `src/channels/whatsapp.ts` - Handler principal WhatsApp (~3500 linhas)
- `src/core/brain.ts` - Chamadas Anthropic (callAnthropic, interpretStrictJson, etc.)
- `src/core/owner.ts` - Estado do dono (pairing, setup)
- `src/core/pendingActions.ts` - State machine do onboarding
- `src/core/env.ts` - Loader de .env com try-catch
- `src/core/cronManager.ts` - Gerenciador de cron jobs
- `src/core/auditLog.ts` - Audit basico
- `src/core/responseRouter.ts` - Roteamento de provider (legado)

### Brain V2 (Novo, modular)
- `src/brain/orchestrator.ts` - Classificador de intents
- `src/brain/migrationWrapper.ts` - Bridge Legacy <-> V2
- `src/brain/actionExecutor.ts` - Executor de acoes
- `src/brain/agents/baseAgent.ts` - Interface base
- `src/brain/agents/chatAgent.ts` - Agente de conversa
- `src/brain/agents/cronAgent.ts` - Agente de agendamento
- `src/brain/memory/memorySystem.ts` - Sistema de memoria unificado

### Gateway
- `src/gateway/messageGateway.ts` - Abstrai canais
- `src/gateway/adapters/whatsappAdapter.ts` - Adaptador WhatsApp

### Skills (legado, funcional)
- `src/skills/scriptSkill.ts` - Executa scripts shell
- `src/skills/emailSkill.ts` - Gerencia emails
- `src/skills/logsSkill.ts` - Le logs
- `src/skills/cronSkill.ts` - Cria cron jobs

### Feature Flags
- `src/featureFlags/featureFlagManager.ts` - Gerenciador
- `src/featureFlags/types.ts` - Tipos

### Infra
- `Dockerfile` - Multi-stage build (node:20-alpine, user turion UID 1001)
- `docker-compose.yml` - Volumes: state, logs, auth_info, .env
- `docker-entrypoint.sh` - Fix permissions + su-exec para turion
- `install.sh` - Instalador via curl | sudo bash
- `.env.example` - Template com valores vazios

---

## DECISOES TECNICAS IMPORTANTES

1. **Provider unico: Anthropic** - Migrado de XAI/Grok em 2026-02-07
2. **Modelo: claude-sonnet-4-5-20250929** - Usado em todas as chamadas
3. **Sem banco de dados** - Tudo em JSON/JSONL no filesystem
4. **Docker non-root** - Container roda como user turion (UID 1001)
5. **Entrypoint fix permissions** - docker-entrypoint.sh roda como root, corrige .env, depois su-exec turion
6. **env.ts resiliente** - try-catch no readFileSync, nao crasha se .env nao legivel
7. **saveEnvValue resiliente** - Se nao conseguir escrever, mantem em process.env
8. **Setup via WhatsApp** - PIN 4 digitos -> API key -> onboarding humanizado
9. **parseApiStatusRequest skip durante setup** - Evita interceptacao da API key

---

## BUGS CONHECIDOS RESOLVIDOS (2026-02-07)

1. **.dockerignore excluia package-lock.json** -> npm ci falhava
2. **set -euo pipefail no install.sh** -> -u crashava com vars undefined
3. **Brain usava XAI/Grok** -> Migrado para callAnthropic() em todas funcoes
4. **Loop de erro 401** -> polish: false + deteccao de auth error
5. **attemptAutoFix checava XAI_API_KEY** -> Mudado para ANTHROPIC_API_KEY
6. **.env.example com placeholders** -> Mudado para valores vazios
7. **.env nao persistia no Docker** -> Volume mount + env_file fallback
8. **EACCES permission denied** -> docker-entrypoint.sh + chown + try-catch
9. **Setup nao iniciava** -> Estado anterior persistia, agora limpa no install
10. **API key interceptada por parseApiStatusRequest** -> "api" + "ok" na key triggeravam status check
11. **Logs nao saiam automaticamente** -> Auto-detect "ENVIE NO WHATSAPP A SENHA" e exit

---

## COMO CONTINUAR O DESENVOLVIMENTO

### Proxima tarefa: Fase 2 - Step 09 (CommandLearner)

**Ordem de implementacao:**
1. Step 09: CommandLearner (`src/brain/autonomy/commandLearner.ts`) ⬜
2. Step 10: TrustEngine (`src/brain/autonomy/trustEngine.ts`) ⬜
3. Step 11: ScriptAgent (`src/brain/agents/scriptAgent.ts`) ⬜
4. Step 12: AuditTrail (`src/brain/autonomy/auditTrail.ts`) ⬜
5. Step 13: Integracao + Testes + Polish ⬜

**Novos arquivos a criar:**
- `src/brain/autonomy/commandLearner.ts`
- `src/brain/autonomy/trustEngine.ts`
- `src/brain/autonomy/auditTrail.ts`
- `src/brain/autonomy/types.ts`
- `src/brain/autonomy/index.ts`
- `src/brain/agents/scriptAgent.ts`

**Arquivos a modificar:**
- `src/brain/migrationWrapper.ts` - Registrar ScriptAgent
- `src/brain/actionExecutor.ts` - Handler "script.run"
- `src/brain/agents/index.ts` - Exportar ScriptAgent
- `src/channels/whatsapp.ts` - Fluxo de confirmacao

**Principios da Fase 2:**
- Sem categorias pre-definidas: o sistema APRENDE com o uso
- Comandos novos SEMPRE pedem confirmacao (seguranca padrao)
- Comandos frequentes ganham confianca automatica
- Comandos destrutivos SEMPRE pedem autorizacao
- Mensagens SEMPRE humanizadas
- Tudo auditado

**Pre-requisitos (todos completos):**
- Fase 1 completa ✅
- Anthropic API funcional ✅
- Docker + installer funcional ✅
- Setup via WhatsApp funcional ✅
