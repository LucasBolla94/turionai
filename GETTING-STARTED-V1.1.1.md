# Getting Started - Turion V1.1.1

**Guia rápido para começar a implementação do roadmap V1.1.1**

---

## 🎯 ANTES DE COMEÇAR

### Pré-requisitos
- ✅ Node.js 18+ instalado
- ✅ Git configurado
- ✅ Anthropic API Key (Claude)
- ✅ Projeto Turion V1.0 funcionando
- ✅ Conhecimento básico de TypeScript

### Arquivos importantes
- [`roadmap-v1.1.1.md`](roadmap-v1.1.1.md) - Roadmap técnico completo (28 steps)
- [`V1.1.1.md`](V1.1.1.md) - Visão geral e objetivos
- [`Updates.md`](Updates.md) - Registro de mudanças
- [`dev-helper.sh`](dev-helper.sh) - Script auxiliar de desenvolvimento

---

## 🚀 QUICK START (5 minutos)

### 1. Tornar script executável (Linux/Mac)

```bash
chmod +x dev-helper.sh
```

### 2. Iniciar desenvolvimento

```bash
./dev-helper.sh
```

Ou manualmente:

```bash
# Opção 1: Iniciar STEP-01
git checkout -b feature/step-01-gateway

# Ver detalhes do step
cat roadmap-v1.1.1.md | grep -A 50 "### STEP 01"

# Implementar código...

# Testar
npm run dev

# Commitar
git add .
git commit -m "feat(step-01): Message Gateway Base

Refs: roadmap-v1.1.1.md#step-01"

git push origin feature/step-01-gateway
```

---

## 📋 WORKFLOW RECOMENDADO

### Para cada STEP:

```
1. 📖 LER
   └─ Ler roadmap-v1.1.1.md#step-XX
   └─ Entender objetivo e requisitos

2. 🔨 IMPLEMENTAR
   └─ Criar branch: feature/step-XX-nome
   └─ Escrever código conforme especificação
   └─ Seguir estrutura de arquivos proposta

3. 🧪 TESTAR
   └─ Executar testes de validação
   └─ Testar manualmente via WhatsApp
   └─ Verificar logs

4. 📝 DOCUMENTAR
   └─ Atualizar Updates.md com:
      - O que foi feito
      - Funções criadas
      - Como ativar
      - Testes realizados

5. ✅ COMMITAR
   └─ git commit com mensagem descritiva
   └─ Seguir padrão Conventional Commits
   └─ Incluir "Refs: roadmap-v1.1.1.md#step-XX"

6. 🚀 DEPLOY
   └─ Merge para main
   └─ Build e deploy
   └─ Monitorar por 24h

7. ➡️ PRÓXIMO
   └─ Marcar step como concluído
   └─ Iniciar próximo step
```

---

## 🛠️ USANDO O DEV HELPER

### Iniciar novo step

```bash
./dev-helper.sh
# Escolher opção 1
# Digitar número: 01
# Digitar nome: gateway
```

Resultado:
- Branch criada: `feature/step-01-gateway`
- Pronto para implementar

### Testar step atual

```bash
./dev-helper.sh
# Escolher opção 3
```

Resultado:
- Roda testes (se existirem)
- Opção de iniciar dev server

### Concluir step

```bash
./dev-helper.sh
# Escolher opção 2
# Digitar título: Message Gateway Base
# Confirmar atualização de Updates.md
# Escolher fazer push
# Escolher fazer merge
```

Resultado:
- Commit criado
- Push feito
- Merge para main (opcional)

### Ver progresso

```bash
./dev-helper.sh
# Escolher opção 4
```

Resultado:
- Mostra barra de progresso
- Lista steps concluídos

---

## 📖 EXEMPLO COMPLETO: STEP-01

### 1. Preparação

```bash
# Criar branch
git checkout -b feature/step-01-gateway

# Abrir roadmap
code roadmap-v1.1.1.md  # buscar "STEP 01"
```

### 2. Criar estrutura de arquivos

```bash
mkdir -p src/gateway/adapters
touch src/gateway/messageGateway.ts
touch src/gateway/types.ts
touch src/gateway/adapters/whatsappAdapter.ts
```

### 3. Implementar código

Copiar código do `roadmap-v1.1.1.md#step-01` para os arquivos criados.

**src/gateway/types.ts:**
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
  deduplicationTTL: number;
}
```

**src/gateway/messageGateway.ts:**
```typescript
// (Copiar código completo do roadmap)
import { EventEmitter } from "node:events";
// ... resto do código
```

**src/gateway/adapters/whatsappAdapter.ts:**
```typescript
// (Copiar código completo do roadmap)
import { MessageAdapter, NormalizedMessage } from "../types";
// ... resto do código
```

### 4. Testar

Criar teste rápido:

```bash
touch src/test-gateway.ts
```

**src/test-gateway.ts:**
```typescript
import { MessageGateway } from "./gateway/messageGateway";

async function test() {
  const gateway = new MessageGateway();

  // Simular mensagem
  const mockMessage = {
    key: {
      id: "msg_123",
      remoteJid: "5511999999999@s.whatsapp.net",
    },
    message: {
      conversation: "teste gateway",
    },
  };

  gateway.on("message", (normalized) => {
    console.log("✅ Mensagem normalizada:", normalized);
  });

  // Processar
  await gateway.processRawMessage("whatsapp", mockMessage);

  // Testar deduplicação
  console.log("\n🔄 Testando deduplicação...");
  await gateway.processRawMessage("whatsapp", mockMessage);
  console.log("✅ Segunda mensagem deve ser ignorada");
}

test();
```

Executar:
```bash
npx tsx src/test-gateway.ts
```

Resultado esperado:
```
✅ Mensagem normalizada: {
  id: 'msg_123',
  text: 'teste gateway',
  ...
}

🔄 Testando deduplicação...
[Gateway] Mensagem duplicada ignorada: msg_123
✅ Segunda mensagem deve ser ignorada
```

### 5. Atualizar Updates.md

Abrir `Updates.md` e adicionar:

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
- `registerAdapter(adapter)` - Registra adaptador de canal
- `processRawMessage(channel, rawMsg)` - Normaliza e processa mensagem
- `sendMessage(channel, to, msg)` - Envia mensagem

**Como ativar:**
\`\`\`typescript
import { MessageGateway } from "./gateway/messageGateway";
import { WhatsAppAdapter } from "./gateway/adapters/whatsappAdapter";

const gateway = new MessageGateway();
gateway.registerAdapter(new WhatsAppAdapter(socket));
gateway.on("message", (msg) => console.log(msg));
\`\`\`

### Testes realizados
- ✅ Deduplicação funcionando
- ✅ Normalização de mensagens WhatsApp
- ✅ Cleanup automático

### Próximo Step
STEP-02: Brain Orchestrator
```

### 6. Commitar

```bash
git add .
git commit -m "feat(step-01): Message Gateway Base

- Created MessageGateway class with event-based architecture
- Implemented deduplication logic (5min TTL)
- Created WhatsAppAdapter for Baileys integration

Features:
- Gateway.processRawMessage(): Normalizes and emits messages
- Gateway.sendMessage(): Sends via appropriate adapter

Tests: Manual deduplication test passed
Refs: roadmap-v1.1.1.md#step-01"

git push origin feature/step-01-gateway
```

### 7. Merge e próximo step

```bash
# Merge para main
git checkout main
git merge feature/step-01-gateway
git push origin main

# Deletar branch (opcional)
git branch -d feature/step-01-gateway

# Iniciar próximo step
git checkout -b feature/step-02-orchestrator
```

---

## ⚡ ATALHOS ÚTEIS

### Comandos rápidos

```bash
# Ver steps pendentes
grep "^### STEP" roadmap-v1.1.1.md | grep -v "✅"

# Ver progresso
grep -c "✅" Updates.md

# Ver última atualização
tail -20 Updates.md

# Buscar step específico
cat roadmap-v1.1.1.md | grep -A 100 "### STEP 05"

# Listar branches de features
git branch | grep feature/step

# Ver diff do step atual
git diff main
```

### Scripts NPM úteis

```bash
# Dev server
npm run dev

# Build
npm run build

# Rodar projeto (production)
npm start

# Testar (se configurado)
npm test
```

---

## 🎯 METAS SEMANAIS

### Semana 1 (Steps 01-04)
- [ ] STEP-01: Message Gateway
- [ ] STEP-02: Brain Orchestrator
- [ ] STEP-03: Memory System
- [ ] STEP-04: Base Agent Interface

**Meta:** Fundação arquitetural completa

### Semana 2 (Steps 05-08)
- [ ] STEP-05: ChatAgent
- [ ] STEP-06: Migration Wrapper
- [ ] STEP-07: Feature Flags
- [ ] STEP-08: Integration Tests

**Meta:** Primeiro agente funcional + testes

### Semana 3-4 (Steps 09-16)
**Meta:** Sistema de autonomia completo

### Semana 5-6 (Steps 17-24)
**Meta:** Inteligência avançada (embeddings, analytics)

### Semana 7-8 (Steps 25-28)
**Meta:** Polish e lançamento

---

## 🐛 TROUBLESHOOTING

### Erro: "Module not found"

```bash
# Rebuild
npm run build

# Verificar imports
npx tsc --noEmit
```

### Erro: "Git conflict"

```bash
# Ver conflitos
git status

# Resolver manualmente ou:
git checkout --theirs <file>  # Aceitar versão deles
git checkout --ours <file>    # Aceitar nossa versão
```

### Teste falhou

1. Verificar logs
2. Comparar com spec no roadmap
3. Revisar código
4. Pedir ajuda (criar issue)

---

## 📚 RECURSOS

### Documentação
- [Roadmap V1.1.1](roadmap-v1.1.1.md)
- [Visão Geral](V1.1.1.md)
- [Updates Log](Updates.md)

### APIs
- [Anthropic (Claude)](https://docs.anthropic.com/)
- [Baileys (WhatsApp)](https://github.com/WhiskeySockets/Baileys)

### Patterns
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Gateway Pattern](https://microservices.io/patterns/apigateway.html)
- [Agent Pattern](https://www.anthropic.com/research/building-effective-agents)

---

## 💬 SUPORTE

**Tem dúvidas?**

1. Consultar roadmap-v1.1.1.md
2. Consultar Updates.md
3. Buscar issue similar no GitHub
4. Criar nova issue com tag `[v1.1.1]`

**Reportar bugs:**

```bash
# Template de issue
Título: [v1.1.1][STEP-XX] Descrição do bug

Descrição:
- O que estava fazendo
- O que esperava
- O que aconteceu

Logs:
[colar logs aqui]

Ambiente:
- Node: vX.X.X
- SO: Windows/Linux/Mac
- Branch: feature/step-XX
```

---

## 🎉 BOA SORTE!

**Você está prestes a transformar o Turion num agente de nível OpenClaw!** 🦞

Siga o roadmap passo a passo e mantenha a documentação atualizada.

**Remember:**
- ✅ Um step de cada vez
- ✅ Testar antes de commitar
- ✅ Documentar tudo
- ✅ Nunca quebrar produção

**Let's build something amazing!** 🚀

---

**Última atualização:** 2026-02-06
**Próxima ação:** Iniciar STEP-01
