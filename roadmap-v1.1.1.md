# Roadmap Técnico V1.1.1 - OpenClaw Evolution
**Versão:** 1.1.1
**Data Início:** 2026-02-06
**Desenvolvedor:** Senior AI Engineer
**Metodologia:** Continuous Integration / Incremental Updates

---

## 🎯 PRINCÍPIOS DE DESENVOLVIMENTO

### 1. **Never Break Production**
- ✅ Cada step é testável independentemente
- ✅ Feature flags para ativar/desativar funcionalidades
- ✅ Rollback plan em cada step
- ✅ Código legado continua funcionando até migração completa

### 2. **Incremental Updates**
- Cada step adiciona 1 feature completa
- Deploy após cada step (não acumular mudanças)
- Testes automatizados antes de commit

### 3. **Documentation First**
- Atualizar `Updates.md` ANTES de commitar
- Commits descritivos seguindo padrão Conventional Commits
- Changelog automático

### 4. **Test-Driven**
- Escrever teste de aceitação ANTES de implementar
- Validar manualmente via WhatsApp
- Métricas de sucesso claras

---

## 📋 ESTRUTURA DE COMMITS

### Padrão Conventional Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `refactor`: Refatoração (sem mudar comportamento)
- `test`: Adicionar testes
- `docs`: Documentação
- `chore`: Tarefas de manutenção

**Exemplo:**
```
feat(gateway): add MessageGateway with WhatsApp adapter

- Created src/gateway/messageGateway.ts
- Implemented message normalization
- Added deduplication logic
- Created WhatsApp adapter

Tests: Manual WhatsApp message flow
Closes: #V1.1.1-STEP-01
```

---

## 📁 ESTRUTURA DE ARQUIVOS DO ROADMAP

```
OpenTur/
├── roadmap-v1.1.1.md          # Este arquivo (plano técnico)
├── V1.1.1.md                  # Visão geral e objetivos
├── Updates.md                 # 📝 Registro de TUDO que foi feito
├── CHANGELOG.md               # Changelog automático
└── .roadmap/
    ├── step-01-gateway.md     # Detalhes técnicos do step 1
    ├── step-02-orchestrator.md
    └── ...
```

---

## 🗺️ ROADMAP GERAL (Overview)

```
FASE 1: FUNDAÇÃO (Steps 01-08)
├── Step 01: Message Gateway Base ✅
├── Step 02: Brain Orchestrator ✅
├── Step 03: Memory System Core ✅
├── Step 04: Base Agent Interface ✅
├── Step 05: ChatAgent (Personality) ✅
├── Step 06: Migration Wrapper ✅
├── Step 07: Feature Flags ✅
└── Step 08: Integration Tests ✅

FASE 2: AUTONOMIA (Steps 09-16)
├── Step 09: Script Safety Analyzer ✅
├── Step 10: Script Categorization ✅
├── Step 11: ScriptAgent Base ✅
├── Step 12: Auto-Approval Logic ✅
├── Step 13: Sandboxed Execution ✅
├── Step 14: ScriptAgent Full Integration ✅
├── Step 15: Audit Logger ✅
└── Step 16: Autonomy Tests ✅

FASE 3: INTELIGÊNCIA (Steps 17-24)
├── Step 17: Long-term Memory (Embeddings) ✅
├── Step 18: Semantic Search ✅
├── Step 19: Context Builder ✅
├── Step 20: LogsAgent (Analysis) ✅
├── Step 21: GitAgent ✅
├── Step 22: Analytics System ✅
├── Step 23: Self-Improvement ✅
└── Step 24: Proactive Suggestions ✅

FASE 4: POLISH (Steps 25-28)
├── Step 25: Conversation Repair ✅
├── Step 26: Response Optimization ✅
├── Step 27: Performance Tuning ✅
└── Step 28: Final Tests + Launch ✅
```

---

# 📘 STEPS DETALHADOS

---

## 🟦 FASE 1: FUNDAÇÃO

### STEP 01: Message Gateway Base
**Duração estimada:** 2-3 horas
**Branch:** `feature/step-01-gateway`
**Status:** ⏳ Pending

#### 🎯 Objetivo
Criar camada de abstração para receber mensagens de qualquer canal (WhatsApp, Telegram, etc).

#### 📝 Requisitos
- Gateway único que normaliza mensagens
- Adaptador para WhatsApp (mantém compatibilidade)
- Sistema de deduplicação (evita processar msg 2x)
- Interface clara para adicionar novos canais

#### 🔨 Implementação

##### Arquivos a criar:
```
src/gateway/
├── messageGateway.ts          # Gateway principal
├── types.ts                   # Interfaces
└── adapters/
    └── whatsappAdapter.ts     # Adaptador WhatsApp
```

##### Código: `src/gateway/types.ts`
```typescript
export interface NormalizedMessage {
  id: string;
  text: string;
  from: string;
  userId: string;
  threadId: string;
  channel: "whatsapp" | "telegram" | "discord" | "http";
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface MessageAdapter {
  name: string;
  normalize(rawMessage: any): NormalizedMessage;
  send(to: string, message: string): Promise<void>;
}

export interface GatewayConfig {
  deduplication: boolean;
  deduplicationTTL: number; // ms
}
```

##### Código: `src/gateway/messageGateway.ts`
```typescript
import { EventEmitter } from "node:events";
import { NormalizedMessage, MessageAdapter, GatewayConfig } from "./types";

export class MessageGateway extends EventEmitter {
  private adapters: Map<string, MessageAdapter> = new Map();
  private seenMessages: Map<string, number> = new Map();
  private config: GatewayConfig;

  constructor(config: GatewayConfig = { deduplication: true, deduplicationTTL: 300000 }) {
    super();
    this.config = config;

    // Limpeza periódica de mensagens vistas
    setInterval(() => this.cleanupSeenMessages(), 60000);
  }

  registerAdapter(adapter: MessageAdapter): void {
    this.adapters.set(adapter.name, adapter);
    console.log(`[Gateway] Adapter registrado: ${adapter.name}`);
  }

  async processRawMessage(channel: string, rawMessage: any): Promise<void> {
    const adapter = this.adapters.get(channel);
    if (!adapter) {
      console.error(`[Gateway] Adapter não encontrado: ${channel}`);
      return;
    }

    try {
      const normalized = adapter.normalize(rawMessage);

      // Deduplicação
      if (this.config.deduplication && this.isDuplicate(normalized.id)) {
        console.log(`[Gateway] Mensagem duplicada ignorada: ${normalized.id}`);
        return;
      }

      if (this.config.deduplication) {
        this.markAsSeen(normalized.id);
      }

      // Emite evento para ser processado
      this.emit("message", normalized);
    } catch (error) {
      console.error(`[Gateway] Erro ao processar mensagem:`, error);
    }
  }

  async sendMessage(channel: string, to: string, message: string): Promise<void> {
    const adapter = this.adapters.get(channel);
    if (!adapter) {
      throw new Error(`Adapter não encontrado: ${channel}`);
    }

    await adapter.send(to, message);
  }

  private isDuplicate(messageId: string): boolean {
    return this.seenMessages.has(messageId);
  }

  private markAsSeen(messageId: string): void {
    this.seenMessages.set(messageId, Date.now());
  }

  private cleanupSeenMessages(): void {
    const now = Date.now();
    const ttl = this.config.deduplicationTTL;

    for (const [id, timestamp] of this.seenMessages.entries()) {
      if (now - timestamp > ttl) {
        this.seenMessages.delete(id);
      }
    }
  }
}
```

##### Código: `src/gateway/adapters/whatsappAdapter.ts`
```typescript
import { MessageAdapter, NormalizedMessage } from "../types";
import { WASocket } from "baileys";

export class WhatsAppAdapter implements MessageAdapter {
  name = "whatsapp";

  constructor(private socket: WASocket) {}

  normalize(rawMessage: any): NormalizedMessage {
    const from = rawMessage.key.remoteJid ?? "unknown";
    const sender = rawMessage.key.participant ?? rawMessage.key.remoteJid ?? "unknown";
    const text =
      rawMessage.message?.conversation ??
      rawMessage.message?.extendedTextMessage?.text ??
      "";

    return {
      id: rawMessage.key.id || `msg_${Date.now()}`,
      text: text.trim(),
      from,
      userId: sender,
      threadId: from.replace(/[^\w]/g, "_"),
      channel: "whatsapp",
      timestamp: Date.now(),
      metadata: {
        key: rawMessage.key,
        pushName: rawMessage.pushName,
      },
    };
  }

  async send(to: string, message: string): Promise<void> {
    await this.socket.sendMessage(to, { text: message });
  }
}
```

#### 🧪 Testes de Validação

##### Teste 1: Deduplicação
```typescript
// Enviar mesma mensagem 2x em <5min
// Resultado esperado: Processar apenas 1x
```

##### Teste 2: Normalização
```typescript
// Enviar msg pelo WhatsApp
// Resultado esperado: NormalizedMessage com todos os campos
```

##### Teste Manual:
```
1. Rodar projeto: npm run dev
2. Enviar pelo WhatsApp: "teste gateway"
3. Verificar log: [Gateway] Mensagem processada
4. Enviar novamente em <5min
5. Verificar log: [Gateway] Mensagem duplicada ignorada
```

#### 📦 Commit

```bash
git checkout -b feature/step-01-gateway
git add src/gateway/
git commit -m "feat(gateway): add MessageGateway with WhatsApp adapter

- Created MessageGateway class with event-based architecture
- Implemented deduplication logic (5min TTL)
- Created WhatsAppAdapter for Baileys integration
- Added cleanup mechanism for seen messages

Features:
- Gateway.processRawMessage(): Normalizes and emits messages
- Gateway.sendMessage(): Sends via appropriate adapter
- Gateway.registerAdapter(): Register new channel adapters

How to use:
const gateway = new MessageGateway();
gateway.registerAdapter(new WhatsAppAdapter(socket));
gateway.on('message', (msg) => console.log(msg));

Tests: Manual deduplication test passed
Refs: roadmap-v1.1.1.md#step-01"

git push origin feature/step-01-gateway
```

#### 📝 Registro em Updates.md

```markdown
## [STEP-01] Message Gateway Base
**Data:** 2026-02-06
**Branch:** feature/step-01-gateway
**Status:** ✅ Concluído

### O que foi feito
Criada camada de abstração (Gateway) para receber mensagens de múltiplos canais.

### Arquivos criados
- `src/gateway/messageGateway.ts` - Gateway principal
- `src/gateway/types.ts` - Interfaces e tipos
- `src/gateway/adapters/whatsappAdapter.ts` - Adaptador WhatsApp

### Funções criadas

#### MessageGateway
**Propósito:** Camada de abstração para processar mensagens de qualquer canal.

**Métodos principais:**
- `registerAdapter(adapter)` - Registra adaptador de canal (WhatsApp, Telegram, etc)
- `processRawMessage(channel, rawMsg)` - Normaliza e processa mensagem
- `sendMessage(channel, to, msg)` - Envia mensagem pelo canal apropriado

**Como ativar:**
```typescript
import { MessageGateway } from "./gateway/messageGateway";
import { WhatsAppAdapter } from "./gateway/adapters/whatsappAdapter";

const gateway = new MessageGateway({
  deduplication: true,
  deduplicationTTL: 300000
});

gateway.registerAdapter(new WhatsAppAdapter(socket));

gateway.on("message", async (normalizedMsg) => {
  console.log("Mensagem recebida:", normalizedMsg.text);
  // Processar mensagem aqui
});
```

### Testes realizados
- ✅ Deduplicação funcionando (mensagens duplicadas ignoradas)
- ✅ Normalização de mensagens WhatsApp
- ✅ Cleanup automático de mensagens vistas após 5min

### Breaking Changes
Nenhum (código legado ainda funciona)

### Próximo Step
STEP-02: Brain Orchestrator
```

#### 🔙 Rollback Plan
```bash
# Se der problema:
git revert HEAD
git push origin feature/step-01-gateway

# Ou voltar pro main:
git checkout main
```

#### ✅ Definition of Done
- [ ] Código commitado e pushed
- [ ] Updates.md atualizado
- [ ] Testes manuais passando
- [ ] Sem erros no console
- [ ] PR criado (se usar)

---

### STEP 02: Brain Orchestrator
**Duração estimada:** 3-4 horas
**Branch:** `feature/step-02-orchestrator`
**Status:** ⏳ Pending

#### 🎯 Objetivo
Criar orquestrador central que recebe mensagens do Gateway e decide qual subagente deve processar.

#### 📝 Requisitos
- Classificação de intents com Claude
- Delegação para subagentes (preparar estrutura)
- Sistema de confiança (0-100%)
- Fallback quando confiança baixa

#### 🔨 Implementação

##### Arquivos a criar:
```
src/brain/
├── orchestrator.ts            # Orquestrador principal
├── types.ts                   # Interfaces
└── agents/
    └── baseAgent.ts           # Interface base para agentes
```

##### Código: `src/brain/types.ts`
```typescript
export interface IntentClassification {
  intent: string;
  agentType: string;
  confidence: number; // 0-100
  args: Record<string, any>;
  needsClarification: boolean;
  clarificationQuestion?: string;
}

export interface ProcessRequest {
  message: string;
  userId: string;
  threadId: string;
  channel: string;
  context?: string;
}

export interface ProcessResult {
  response: string;
  actions?: Array<{
    type: string;
    payload: any;
  }>;
  shouldSaveMemory?: boolean;
}
```

##### Código: `src/brain/agents/baseAgent.ts`
```typescript
import Anthropic from "@anthropic-ai/sdk";

export interface AgentExecuteParams {
  message: string;
  intent: string;
  args: Record<string, any>;
  context: string;
  userId: string;
  threadId: string;
}

export abstract class BaseAgent {
  protected client: Anthropic;

  abstract name: string;
  abstract description: string;
  abstract canHandle(intent: string): boolean;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || ""
    });
  }

  abstract execute(params: AgentExecuteParams): Promise<{
    response: string;
    actions?: any[];
  }>;

  protected async callClaude(system: string, userMessage: string, model = "claude-sonnet-4-5-20250929"): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: 4096,
        temperature: 0.3,
        system,
        messages: [{ role: "user", content: userMessage }],
      });

      return response.content[0].type === "text"
        ? response.content[0].text
        : "";
    } catch (error) {
      console.error(`[${this.name}] Erro ao chamar Claude:`, error);
      throw error;
    }
  }
}
```

##### Código: `src/brain/orchestrator.ts`
```typescript
import Anthropic from "@anthropic-ai/sdk";
import { IntentClassification, ProcessRequest, ProcessResult } from "./types";
import { BaseAgent } from "./agents/baseAgent";

export class BrainOrchestrator {
  private client: Anthropic;
  private agents: Map<string, BaseAgent> = new Map();

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || ""
    });
  }

  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.name, agent);
    console.log(`[Orchestrator] Agente registrado: ${agent.name}`);
  }

  async process(request: ProcessRequest): Promise<ProcessResult> {
    console.log(`[Orchestrator] Processando: "${request.message}"`);

    // STEP 1: Classificar intent
    const classification = await this.classifyIntent(request);

    console.log(`[Orchestrator] Intent: ${classification.intent}, Confiança: ${classification.confidence}%`);

    // STEP 2: Se confiança baixa, pedir clarificação
    if (classification.confidence < 60) {
      return {
        response: classification.clarificationQuestion ||
                  "Desculpa, não entendi bem. Pode reformular?",
      };
    }

    // STEP 3: Encontrar agente apropriado
    const agent = this.findAgent(classification.agentType);
    if (!agent) {
      console.warn(`[Orchestrator] Agente não encontrado: ${classification.agentType}`);
      return {
        response: "Ainda não sei fazer isso. Pode tentar de outra forma?",
      };
    }

    // STEP 4: Executar via agente
    try {
      const result = await agent.execute({
        message: request.message,
        intent: classification.intent,
        args: classification.args,
        context: request.context || "",
        userId: request.userId,
        threadId: request.threadId,
      });

      return {
        response: result.response,
        actions: result.actions,
        shouldSaveMemory: true,
      };
    } catch (error) {
      console.error(`[Orchestrator] Erro no agente ${agent.name}:`, error);
      return {
        response: "Ops, deu um erro aqui. Pode tentar de novo?",
      };
    }
  }

  private async classifyIntent(request: ProcessRequest): Promise<IntentClassification> {
    const systemPrompt = `Você é um classificador de intenções inteligente.

AGENTES DISPONÍVEIS:
- chat: conversa casual, perguntas gerais, saudações
- email: gerenciar emails (listar, ler, responder, deletar)
- cron: criar lembretes e tarefas agendadas
- logs: visualizar logs de sistemas
- script: executar scripts e comandos
- git: operações git (status, commit, push)

Analise a mensagem do usuário e retorne JSON:
{
  "intent": "descrição curta da intenção",
  "agentType": "chat|email|cron|logs|script|git",
  "confidence": 0-100,
  "args": { /* argumentos extraídos */ },
  "needsClarification": true/false,
  "clarificationQuestion": "pergunta se precisar esclarecer"
}

REGRAS:
1. Se confiança > 70%, retorne intent específico
2. Se confiança < 70%, marque needsClarification=true
3. Sempre extraia argumentos relevantes

EXEMPLOS:
Msg: "me lembra de ligar pro João em 10min"
→ {"intent": "criar lembrete", "agentType": "cron", "confidence": 95, "args": {"delay": "10min", "message": "ligar pro João"}, "needsClarification": false}

Msg: "tem email importante?"
→ {"intent": "listar emails importantes", "agentType": "email", "confidence": 90, "args": {"filter": "important"}, "needsClarification": false}

Msg: "oi"
→ {"intent": "saudação", "agentType": "chat", "confidence": 100, "args": {}, "needsClarification": false}

Msg: "aquilo"
→ {"intent": "referência vaga", "agentType": "chat", "confidence": 20, "args": {}, "needsClarification": true, "clarificationQuestion": "O que você quer dizer com 'aquilo'? Pode dar mais detalhes?"}`;

    try {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1000,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Classifique esta mensagem: "${request.message}"`
        }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("Claude não retornou JSON válido");
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("[Orchestrator] Erro na classificação:", error);

      // Fallback: classificação básica
      return {
        intent: "unknown",
        agentType: "chat",
        confidence: 30,
        args: {},
        needsClarification: true,
        clarificationQuestion: "Não entendi. Pode explicar melhor?",
      };
    }
  }

  private findAgent(agentType: string): BaseAgent | undefined {
    // Tenta encontrar por nome exato
    let agent = this.agents.get(agentType);
    if (agent) return agent;

    // Tenta encontrar por canHandle
    for (const [_, agent] of this.agents) {
      if (agent.canHandle(agentType)) {
        return agent;
      }
    }

    return undefined;
  }
}
```

#### 🧪 Testes de Validação

##### Teste 1: Classificação de alta confiança
```
Input: "oi tudo bem?"
Expected: agentType="chat", confidence > 90
```

##### Teste 2: Classificação de baixa confiança
```
Input: "aquilo"
Expected: needsClarification=true, clarificationQuestion presente
```

##### Teste Manual:
```
1. Criar teste rápido em src/test-orchestrator.ts:

import { BrainOrchestrator } from "./brain/orchestrator";

async function test() {
  const orchestrator = new BrainOrchestrator();

  const result = await orchestrator.process({
    message: "oi tudo bem?",
    userId: "test",
    threadId: "test_thread",
    channel: "whatsapp",
  });

  console.log("Resultado:", result);
}

test();

2. Rodar: npx tsx src/test-orchestrator.ts
3. Verificar output contém response
```

#### 📦 Commit

```bash
git checkout -b feature/step-02-orchestrator
git add src/brain/
git commit -m "feat(brain): add BrainOrchestrator with intent classification

- Created BrainOrchestrator class
- Implemented intent classification with Claude Sonnet 4.5
- Added confidence-based clarification system
- Created BaseAgent interface for future agents

Features:
- Orchestrator.process(): Main entry point for message processing
- Orchestrator.classifyIntent(): LLM-based intent classification
- Orchestrator.registerAgent(): Register specialized agents

Classification confidence levels:
- > 70%: Execute with agent
- < 60%: Request clarification
- Fallback: Safe default to chat agent

How to use:
const orchestrator = new BrainOrchestrator();
const result = await orchestrator.process({
  message: 'oi',
  userId: 'user123',
  threadId: 'thread_abc',
  channel: 'whatsapp'
});

Tests: Manual classification tests passed
Refs: roadmap-v1.1.1.md#step-02"

git push origin feature/step-02-orchestrator
```

#### 📝 Registro em Updates.md

```markdown
## [STEP-02] Brain Orchestrator
**Data:** 2026-02-06
**Branch:** feature/step-02-orchestrator
**Status:** ✅ Concluído

### O que foi feito
Criado orquestrador central (Brain) que classifica intenções e delega para subagentes.

### Arquivos criados
- `src/brain/orchestrator.ts` - Orquestrador principal
- `src/brain/types.ts` - Interfaces e tipos
- `src/brain/agents/baseAgent.ts` - Classe base para agentes

### Funções criadas

#### BrainOrchestrator
**Propósito:** Orquestrar processamento de mensagens via LLM e subagentes.

**Métodos principais:**
- `process(request)` - Processa mensagem e retorna resposta
- `classifyIntent(request)` - Classifica intenção com Claude
- `registerAgent(agent)` - Registra subagente

**Sistema de Confiança:**
- Confiança > 70% → Executa com agente
- Confiança 60-70% → Executa mas marca como incerto
- Confiança < 60% → Pede clarificação

**Como ativar:**
```typescript
import { BrainOrchestrator } from "./brain/orchestrator";

const brain = new BrainOrchestrator();

const result = await brain.process({
  message: "oi tudo bem?",
  userId: "user123",
  threadId: "thread_abc",
  channel: "whatsapp",
});

console.log(result.response);
```

#### BaseAgent
**Propósito:** Interface base para criar agentes especializados.

**Métodos abstratos:**
- `name` - Nome do agente
- `description` - Descrição da função
- `canHandle(intent)` - Se pode lidar com este intent
- `execute(params)` - Executa lógica do agente

**Métodos helpers:**
- `callClaude(system, message)` - Helper para chamar Claude

### Testes realizados
- ✅ Classificação de saudações (confidence > 90%)
- ✅ Detecção de mensagens vagas (confidence < 60%)
- ✅ Fallback para chat quando agente não existe

### Breaking Changes
Nenhum

### Próximo Step
STEP-03: Memory System Core
```

---

### STEP 03: Memory System Core
**Duração estimada:** 3-4 horas
**Branch:** `feature/step-03-memory`
**Status:** ⏳ Pending

#### 🎯 Objetivo
Criar sistema de memória de 3 camadas (curto/médio/longo prazo).

#### 📝 Requisitos
- Short-term memory (RAM - últimas 10 msgs)
- Session memory (JSON - conversa atual)
- Long-term memory (estrutura básica para embeddings futuros)
- Context builder (monta contexto unificado)

#### 🔨 Implementação

##### Arquivos a criar:
```
src/brain/memory/
├── memorySystem.ts           # Sistema unificado
├── shortTermMemory.ts        # RAM
├── sessionMemory.ts          # Por thread
├── longTermMemory.ts         # Placeholder para embeddings
└── contextBuilder.ts         # Monta contexto
```

##### Código: `src/brain/memory/shortTermMemory.ts`
```typescript
export class ShortTermMemory {
  private messages: string[] = [];
  private maxSize: number;

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }

  add(message: string): void {
    this.messages.push(message);
    if (this.messages.length > this.maxSize) {
      this.messages.shift();
    }
  }

  get(): string[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
  }
}
```

##### Código: `src/brain/memory/sessionMemory.ts`
```typescript
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

export class SessionMemory {
  private sessions: Map<string, string[]> = new Map();
  private persistPath = resolve("state", "memory", "sessions.json");

  async load(): Promise<void> {
    try {
      const data = await readFile(this.persistPath, "utf8");
      const parsed = JSON.parse(data);
      this.sessions = new Map(Object.entries(parsed));
      console.log("[SessionMemory] Carregado:", this.sessions.size, "sessões");
    } catch {
      console.log("[SessionMemory] Nenhuma sessão anterior encontrada");
    }
  }

  async save(): Promise<void> {
    try {
      await mkdir(resolve("state", "memory"), { recursive: true });
      const obj = Object.fromEntries(this.sessions);
      await writeFile(this.persistPath, JSON.stringify(obj, null, 2));
    } catch (error) {
      console.error("[SessionMemory] Erro ao salvar:", error);
    }
  }

  add(threadId: string, message: string): void {
    if (!this.sessions.has(threadId)) {
      this.sessions.set(threadId, []);
    }
    this.sessions.get(threadId)!.push(message);

    // Auto-save assíncrono
    this.save().catch(console.error);
  }

  get(threadId: string, last?: number): string[] {
    const messages = this.sessions.get(threadId) || [];
    return last ? messages.slice(-last) : messages;
  }

  clear(threadId: string): void {
    this.sessions.delete(threadId);
    this.save().catch(console.error);
  }
}
```

##### Código: `src/brain/memory/longTermMemory.ts`
```typescript
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

export interface LongTermEntry {
  id: string;
  text: string;
  timestamp: string;
  userId: string;
  category: "fact" | "task" | "conversation" | "preference";
  keywords: string[];
}

export class LongTermMemory {
  private entries: LongTermEntry[] = [];
  private persistPath = resolve("state", "memory", "longterm.json");

  async load(): Promise<void> {
    try {
      const data = await readFile(this.persistPath, "utf8");
      this.entries = JSON.parse(data);
      console.log("[LongTermMemory] Carregado:", this.entries.length, "entradas");
    } catch {
      console.log("[LongTermMemory] Nenhuma memória de longo prazo encontrada");
    }
  }

  async save(): Promise<void> {
    try {
      await mkdir(resolve("state", "memory"), { recursive: true });
      await writeFile(this.persistPath, JSON.stringify(this.entries, null, 2));
    } catch (error) {
      console.error("[LongTermMemory] Erro ao salvar:", error);
    }
  }

  async add(entry: Omit<LongTermEntry, "id">): Promise<void> {
    const newEntry: LongTermEntry = {
      id: `ltm_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      ...entry,
    };

    this.entries.push(newEntry);

    // Limita a 1000 entradas (por enquanto)
    if (this.entries.length > 1000) {
      this.entries.shift();
    }

    await this.save();
  }

  // Busca simples por keyword (substituir por embeddings no futuro)
  search(query: string, limit: number = 5): LongTermEntry[] {
    const queryLower = query.toLowerCase();

    const scored = this.entries.map((entry) => {
      let score = 0;

      // Score por texto
      if (entry.text.toLowerCase().includes(queryLower)) {
        score += 10;
      }

      // Score por keywords
      entry.keywords.forEach((kw) => {
        if (queryLower.includes(kw.toLowerCase())) {
          score += 5;
        }
      });

      return { entry, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.entry);
  }
}
```

##### Código: `src/brain/memory/memorySystem.ts`
```typescript
import { ShortTermMemory } from "./shortTermMemory";
import { SessionMemory } from "./sessionMemory";
import { LongTermMemory } from "./longTermMemory";

export class MemorySystem {
  private shortTerm: ShortTermMemory;
  private session: SessionMemory;
  private longTerm: LongTermMemory;

  constructor() {
    this.shortTerm = new ShortTermMemory(10);
    this.session = new SessionMemory();
    this.longTerm = new LongTermMemory();
  }

  async initialize(): Promise<void> {
    await this.session.load();
    await this.longTerm.load();
    console.log("[MemorySystem] Inicializado");
  }

  // Adiciona mensagem em todas as camadas relevantes
  addMessage(threadId: string, message: string, isImportant: boolean = false): void {
    // Short-term (sempre)
    this.shortTerm.add(message);

    // Session (sempre)
    this.session.add(threadId, message);

    // Long-term (só se importante)
    if (isImportant) {
      this.longTerm.add({
        text: message,
        timestamp: new Date().toISOString(),
        userId: threadId,
        category: "conversation",
        keywords: this.extractKeywords(message),
      }).catch(console.error);
    }
  }

  // Monta contexto unificado
  async buildContext(threadId: string, currentMessage: string): Promise<string> {
    const parts: string[] = [];

    // Short-term
    const shortTermMsgs = this.shortTerm.get();
    if (shortTermMsgs.length > 0) {
      parts.push(`CONTEXTO RECENTE:\n${shortTermMsgs.join("\n")}`);
    }

    // Session (últimas 20)
    const sessionMsgs = this.session.get(threadId, 20);
    if (sessionMsgs.length > 0) {
      parts.push(`CONVERSA ATUAL:\n${sessionMsgs.join("\n")}`);
    }

    // Long-term (busca por relevância)
    const relevant = this.longTerm.search(currentMessage, 3);
    if (relevant.length > 0) {
      const formatted = relevant.map((entry, i) =>
        `${i + 1}. [${entry.category}] ${entry.text} (${entry.timestamp.slice(0, 10)})`
      ).join("\n");
      parts.push(`MEMÓRIAS RELEVANTES:\n${formatted}`);
    }

    return parts.join("\n\n");
  }

  private extractKeywords(text: string): string[] {
    // Extração simples por enquanto
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(["de", "a", "o", "que", "e", "do", "da", "em", "um", "para", "é", "com", "não", "uma", "os", "no", "se", "na", "por", "mais", "as", "dos", "como", "mas", "foi", "ao", "ele", "das", "tem", "à", "seu", "sua", "ou", "ser", "quando", "muito", "há", "nos", "já", "está", "eu", "também", "só", "pelo", "pela", "até", "isso", "ela", "entre", "era", "depois", "sem", "mesmo", "aos", "ter", "seus", "quem", "nas", "me", "esse", "eles", "estão", "você", "tinha", "foram", "essa", "num", "nem", "suas", "meu", "às", "minha", "têm", "numa", "pelos", "elas", "havia", "seja", "qual", "será", "nós", "tenho", "lhe", "deles", "essas", "esses", "pelas", "este", "fosse", "dele"]);

    return words
      .filter((w) => w.length > 3 && !stopWords.has(w))
      .slice(0, 10);
  }
}
```

#### 🧪 Testes de Validação

##### Teste 1: Short-term overflow
```typescript
// Adicionar 15 mensagens
// Verificar que mantém apenas últimas 10
```

##### Teste 2: Session persistence
```typescript
// Adicionar mensagens
// Reiniciar sistema
// Verificar que session foi carregada
```

##### Teste 3: Long-term search
```typescript
// Adicionar "deploy do projeto api"
// Buscar por "api"
// Verificar que encontra
```

#### 📦 Commit
```bash
git checkout -b feature/step-03-memory
git add src/brain/memory/
git commit -m "feat(memory): add 3-layer memory system

- Created ShortTermMemory (RAM, last 10 messages)
- Created SessionMemory (persistent, per-thread)
- Created LongTermMemory (keyword-based search, placeholder for embeddings)
- Created MemorySystem (unified interface)
- Implemented context builder

Features:
- MemorySystem.addMessage(): Add to all relevant layers
- MemorySystem.buildContext(): Build unified context for LLM
- Auto-persistence for session and long-term

Memory layers:
1. Short-term: Last 10 messages (volatile)
2. Session: Current conversation (persistent JSON)
3. Long-term: Important facts (searchable, persistent)

How to use:
const memory = new MemorySystem();
await memory.initialize();
memory.addMessage('thread123', 'User: oi', false);
const context = await memory.buildContext('thread123', 'nova msg');

Tests: Layer overflow, persistence, search
Refs: roadmap-v1.1.1.md#step-03"

git push origin feature/step-03-memory
```

#### 📝 Registro em Updates.md
```markdown
## [STEP-03] Memory System Core
**Data:** 2026-02-06
**Branch:** feature/step-03-memory
**Status:** ✅ Concluído

### O que foi feito
Sistema de memória de 3 camadas para contexto persistente.

### Arquivos criados
- `src/brain/memory/memorySystem.ts`
- `src/brain/memory/shortTermMemory.ts`
- `src/brain/memory/sessionMemory.ts`
- `src/brain/memory/longTermMemory.ts`

### Funções criadas

#### MemorySystem
**Propósito:** Gerenciar memória em 3 camadas.

**Camadas:**
1. **Short-term**: Últimas 10 mensagens (RAM, volátil)
2. **Session**: Conversa completa atual (JSON persistente)
3. **Long-term**: Fatos importantes (busca por keywords, futuro: embeddings)

**Métodos:**
- `initialize()` - Carrega memórias persistentes
- `addMessage(threadId, msg, isImportant)` - Adiciona em camadas apropriadas
- `buildContext(threadId, currentMsg)` - Monta contexto unificado

**Como ativar:**
```typescript
import { MemorySystem } from "./brain/memory/memorySystem";

const memory = new MemorySystem();
await memory.initialize();

// Adicionar mensagem normal
memory.addMessage("thread123", "User: oi");

// Adicionar mensagem importante (vai pro long-term)
memory.addMessage("thread123", "User fez deploy do projeto api", true);

// Construir contexto
const context = await memory.buildContext("thread123", "mensagem atual");
```

**Arquivos persistentes:**
- `state/memory/sessions.json` - Sessões ativas
- `state/memory/longterm.json` - Memórias de longo prazo

### Testes realizados
- ✅ Short-term mantém apenas 10 últimas
- ✅ Session persiste após reload
- ✅ Long-term busca por keywords

### Breaking Changes
Nenhum

### Próximo Step
STEP-04: Base Agent Interface (preparar para ChatAgent)
```

---

## 🔄 CONTINUOUS INTEGRATION

### Workflow para cada Step

```
1. Criar branch feature/step-XX
2. Implementar código
3. Testar manualmente
4. Atualizar Updates.md
5. Commit com mensagem descritiva
6. Push
7. Merge para main (ou criar PR)
8. Deploy (se aplicável)
9. Monitorar por 24h
```

### Feature Flags

Criar `src/config/features.ts`:
```typescript
export const FEATURES = {
  USE_GATEWAY: process.env.TURION_USE_GATEWAY === "true",
  USE_ORCHESTRATOR: process.env.TURION_USE_ORCHESTRATOR === "true",
  USE_MEMORY_SYSTEM: process.env.TURION_USE_MEMORY === "true",
  USE_AUTO_APPROVAL: process.env.TURION_AUTO_APPROVE === "true",
};
```

No `.env`:
```bash
# Feature Flags (habilitar gradualmente)
TURION_USE_GATEWAY=false           # Step 01
TURION_USE_ORCHESTRATOR=false      # Step 02
TURION_USE_MEMORY=false            # Step 03
TURION_AUTO_APPROVE=false          # Steps 09-13
```

---

## 📝 TEMPLATE Updates.md

Criar arquivo `Updates.md` com este template:

```markdown
# Updates Log - Turion V1.1.1

**Última atualização:** 2026-02-06
**Versão:** 1.1.1
**Status:** 🚧 Em Desenvolvimento

---

## Como usar este documento

Este arquivo registra TODAS as mudanças feitas no projeto durante a evolução para V1.1.1.

**Estrutura de cada entry:**
- O que foi feito (resumo)
- Arquivos criados/modificados
- Funções criadas (nome, propósito, como usar)
- Testes realizados
- Breaking changes (se houver)
- Próximo step

---

## [STEP-XX] Título do Step
**Data:** YYYY-MM-DD
**Branch:** feature/step-xx-name
**Status:** ✅ Concluído | 🚧 Em Progresso | ⏳ Pending

### O que foi feito
Descrição clara do que foi implementado.

### Arquivos criados
- `path/to/file.ts` - Descrição

### Arquivos modificados
- `path/to/file.ts` - O que mudou

### Funções criadas

#### FunctionName
**Propósito:** Para que serve esta função.

**Parâmetros:**
- `param1` (type) - Descrição

**Retorno:** Tipo e descrição

**Como ativar:**
\`\`\`typescript
const exemplo = new FunctionName();
exemplo.metodo();
\`\`\`

### Configuração (.env)
Variáveis adicionadas ou modificadas:
\`\`\`bash
NOVA_VAR=valor
\`\`\`

### Testes realizados
- ✅ Teste 1 descrição
- ✅ Teste 2 descrição

### Breaking Changes
- Mudança X (como migrar)
- Mudança Y (como migrar)

### Rollback
Como reverter se der problema:
\`\`\`bash
git revert COMMIT_HASH
\`\`\`

### Próximo Step
STEP-XX: Título

---

## Changelog Resumido

### 2026-02-06
- [STEP-01] Message Gateway Base
- [STEP-02] Brain Orchestrator
- [STEP-03] Memory System Core

---

## Índice de Funcionalidades

### Gateway System
- `MessageGateway` - [STEP-01]
- `WhatsAppAdapter` - [STEP-01]

### Brain System
- `BrainOrchestrator` - [STEP-02]
- `BaseAgent` - [STEP-02]

### Memory System
- `MemorySystem` - [STEP-03]
- `ShortTermMemory` - [STEP-03]
- `SessionMemory` - [STEP-03]
- `LongTermMemory` - [STEP-03]

---

## Arquitetura Atual

\`\`\`
[Gateway] → [Orchestrator] → [Agents] → [Executors]
              ↓
          [Memory System]
\`\`\`

---

## Estatísticas

- **Steps concluídos:** 0/28
- **Cobertura de testes:** N/A
- **Linhas de código:** ~0
- **Agentes implementados:** 0/6
```

---

## 🎯 PRÓXIMOS STEPS (Resumo)

### FASE 1 - Fundação (Steps 04-08)
- **STEP 04:** Base Agent Interface completa
- **STEP 05:** ChatAgent (primeiro agente funcional)
- **STEP 06:** Migration Wrapper (conectar novo sistema ao legado)
- **STEP 07:** Feature Flags system
- **STEP 08:** Integration Tests

### FASE 2 - Autonomia (Steps 09-16)
- **STEP 09:** Script Safety Analyzer
- **STEP 10:** Script Categorization (safe/risky/destructive)
- **STEP 11:** ScriptAgent Base
- **STEP 12:** Auto-Approval Logic
- **STEP 13:** Sandboxed Execution
- **STEP 14:** ScriptAgent Full
- **STEP 15:** Audit Logger
- **STEP 16:** Autonomy Tests

### FASE 3 - Inteligência (Steps 17-24)
- **STEP 17:** Long-term Memory Embeddings (OpenAI)
- **STEP 18:** Semantic Search
- **STEP 19:** Advanced Context Builder
- **STEP 20:** LogsAgent
- **STEP 21:** GitAgent
- **STEP 22:** Analytics System
- **STEP 23:** Self-Improvement
- **STEP 24:** Proactive Suggestions

### FASE 4 - Polish (Steps 25-28)
- **STEP 25:** Conversation Repair
- **STEP 26:** Response Optimization
- **STEP 27:** Performance Tuning
- **STEP 28:** Final Tests + Launch

---

## ✅ CHECKLIST DE PROGRESSO

### Fase 1: Fundação
- [ ] STEP-01: Message Gateway ⏳
- [ ] STEP-02: Brain Orchestrator ⏳
- [ ] STEP-03: Memory System ⏳
- [ ] STEP-04: Base Agent Interface
- [ ] STEP-05: ChatAgent
- [ ] STEP-06: Migration Wrapper
- [ ] STEP-07: Feature Flags
- [ ] STEP-08: Integration Tests

### Fase 2: Autonomia
- [ ] STEP-09: Script Safety Analyzer
- [ ] STEP-10: Script Categorization
- [ ] STEP-11: ScriptAgent Base
- [ ] STEP-12: Auto-Approval Logic
- [ ] STEP-13: Sandboxed Execution
- [ ] STEP-14: ScriptAgent Full
- [ ] STEP-15: Audit Logger
- [ ] STEP-16: Autonomy Tests

### Fase 3: Inteligência
- [ ] STEP-17: Embeddings
- [ ] STEP-18: Semantic Search
- [ ] STEP-19: Context Builder
- [ ] STEP-20: LogsAgent
- [ ] STEP-21: GitAgent
- [ ] STEP-22: Analytics
- [ ] STEP-23: Self-Improvement
- [ ] STEP-24: Proactive Suggestions

### Fase 4: Polish
- [ ] STEP-25: Conversation Repair
- [ ] STEP-26: Response Optimization
- [ ] STEP-27: Performance Tuning
- [ ] STEP-28: Launch

---

## 🚀 COMANDO RÁPIDO DE DESENVOLVIMENTO

Criar script `dev.sh`:
```bash
#!/bin/bash

# Script de desenvolvimento rápido

echo "🚀 Turion Dev Helper"
echo ""
echo "1. Iniciar step"
echo "2. Testar step atual"
echo "3. Commitar step"
echo "4. Ver progresso"
echo ""
read -p "Escolha (1-4): " choice

case $choice in
  1)
    read -p "Número do step (ex: 04): " step
    git checkout -b "feature/step-$step"
    echo "✅ Branch criada: feature/step-$step"
    ;;
  2)
    npm run dev
    ;;
  3)
    read -p "Número do step (ex: 04): " step
    read -p "Título (ex: Base Agent Interface): " title
    git add .
    git commit -m "feat(step-$step): $title"
    git push origin HEAD
    echo "✅ Commitado e pushed!"
    ;;
  4)
    cat roadmap-v1.1.1.md | grep "\\[x\\]" | wc -l
    echo "steps concluídos"
    ;;
esac
```

Tornar executável:
```bash
chmod +x dev.sh
```

Usar:
```bash
./dev.sh
```

---

## 📞 SUPORTE E DÚVIDAS

- **Roadmap:** Este arquivo (roadmap-v1.1.1.md)
- **Visão Geral:** V1.1.1.md
- **Updates:** Updates.md (após cada step)
- **Issues:** Criar issue no GitHub com tag [v1.1.1]

---

**Status:** 📘 Roadmap completo e pronto para execução
**Próxima ação:** Iniciar STEP-01
**Estimativa total:** 8 semanas (28 steps)
**Início recomendado:** Imediato
