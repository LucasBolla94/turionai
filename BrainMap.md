# BrainMap  Tur (Turion)

Este documento descreve **o que o Tur faz**, como o sistema est organizado e **onde cada parte vive no cdigo**. A ideia  ser simples de ler, mas sem perder detalhes importantes para manuteno futura.

## 1) Viso geral (o que o Tur )
Tur  um assistente pessoal via WhatsApp, com arquitetura segura e auditvel:
- **WhatsApp** como canal principal (Baileys)
- **Crebro (Grok)** apenas interpreta e sugere intenes/aes (nunca executa comandos)
- **Executor** roda scripts permitidos, com lista fixa
- **Memria** em JSON (fatos, decises, projetos, tarefas)
- **Auditoria** e **conversas** registradas em disco

Fluxo base:
```
Mensagem ? Pipeline ? (Grok JSON) ? Validao ? Skill/Executor ? Log + Memria
```

## 2) O que o Tur sabe fazer hoje
### Aes principais
- **Responder mensagens** com tom humano (ajustado pelo usurio)
- **Human UX Engine**: polimento de resposta com IA + templates (varia sem repetir)
- **Executar comandos permitidos** (`--status`, `run`, `logs`, `deploy`, `redeploy` etc.)
- **Checar e resumir logs**
- **CRON** (lembretes e tarefas programadas)
- **Atualizar o prprio cdigo** com `--update`
- **Checar status das APIs** (Grok, Email, WhatsApp)
- **Email (Gmail/iCloud)**: listar, ler, explicar, responder e apagar
- **Memria inteligente**: lembrar fatos, decises e projetos
- **Onboarding humanizado** (primeira configurao)

### Exemplos de comandos teis
- `--status`
- `list scripts`
- `run <script>`
- `deploy <nome> <repo>`
- `redeploy <nome>`
- `logs <projeto> 200`
- `diagnose <projeto> 200`
- `timezone Europe/London`
- `email list`
- `email read <id>`
- `email delete <id>`
- `--update`

## 3) Arquitetura por mdulos
### 3.1 WhatsApp (entrada principal)
Arquivo: `src/channels/whatsapp.ts`
Responsvel por:
- Conectar no WhatsApp
- Gerar e mostrar QR
- Reconectar em falhas
- Processar mensagens
- Chamar pipeline + brain + skills

### 3.2 Crebro (Grok)
Arquivo: `src/core/brain.ts`
- Faz chamadas ao Grok via API
- Espera JSON estrito
- Interpreta inteno, risco e aes
### 3.2.1 Human UX Engine
Arquivos: `src/core/ux/HumanReply.ts`, `scripts/human_reply_templates.json`, `state/persona/human_reply_state.json`
- Polimento de resposta com IA (quando chave configurada)
- Evita respostas iguais seguidas usando seed + hash

### 3.3 Pipeline de Mensagens
Arquivo: `src/core/messagePipeline.ts`
- Classifica texto em `COMMAND`, `CHAT`, `UNKNOWN`
- Extrai comando e args simples

### 3.4 Executor (scripts permitidos)
Arquivo: `src/executor/executor.ts`
- Roda scripts do diretrio `scripts/`
- Bloqueia execuo fora da whitelist

### 3.5 Skills
Diretrio: `src/skills/`
- Cada funcionalidade real vira uma Skill
- Skills so executadas pelo `PlanRunner`

### 3.6 Plano (RUN_PLAN)
Arquivo: `src/core/planRunner.ts`
- Executa mltiplas skills em sequncia
- Auditvel e seguro

### 3.7 Memria
Arquivo: `src/core/memoryStore.ts`
- Guarda fatos, decises, tarefas, projetos
- Index por keyword
- **Formato JSON**:
```
state/memory/memory.json
state/memory/keyword_index.json
```

### 3.8 Conversa e Digest
Arquivos:
- `src/core/conversationStore.ts`
- `state/conversations/YYYY-MM-DD/*.jsonl`
- `state/digests/YYYY-MM-DD.json`

### 3.9 Onboarding (setup humano)
Arquivos:
- `src/core/owner.ts`
- `src/channels/whatsapp.ts`
- `src/config/capabilities.ts`

Fluxo:
1) Pareamento por codigo
2) API do Grok
3) Nome do assistente (definido pelo usuario)
4) Nome do usuario (pergunta sutil)
5) Cidade/pais -> IA infere timezone
6) Confirmacao final
7) Pos-setup com exemplos

Notas:
- Idioma -> detectado automaticamente pela linguagem do usuario.
- Nao pergunta funcionalidade: padrao -> assistente pessoal.

### 3.10 Timezone
Arquivo: `src/core/timezone.ts`
- Valida timezone
- Normaliza entradas
### 3.11 Update automatico
Arquivos:
- `scripts/update_self.sh`
- `scripts/update_check.sh`
- `src/core/updateStatus.ts`
- `src/channels/whatsapp.ts`

Cron automatico checa updates a cada 5 minutos.
O cron de update e tratado como essencial: na inicializacao ele e validado,
recriado se faltar e normalizado para evitar duplicacao.
Quando o usuario pergunta sobre update do modelo (Grok), o bot explica que e um servico externo e mostra o modelo configurado.

- Inferncia por cidade/pas

### 3.12 Auto-fix (erros)
Arquivos:
- src/channels/whatsapp.ts

Comportamento:
- Detecta erros e tenta corrigir automaticamente (logs locais + diagnostico com IA).
- Para ENOENT em /logs, cria pasta e arquivo base.
- Executa passos seguros sugeridos quando ha diagnostico.

### 3.13 Atualizacao de APIs via conversa
Arquivos:
- src/channels/whatsapp.ts

Comportamento:
- Detecta blocos de variaveis (KEY=VAL) com allowlist.
- Atualiza .env e process.env automaticamente.
- Revalida status das APIs em seguida.

Cron automtico checa updates a cada 5 minutos.
O cron de update  tratado como essencial: na inicializao ele  validado,
recriado se faltar e normalizado para evitar duplicao.
Quando o usurio pergunta sobre update do modelo (Grok), o bot explica que  um servio externo e mostra o modelo configurado.

## 4) Arquivos importantes
- `docker-compose.yml` ? container principal
- `scripts/` ? scripts permitidos
- `state/` ? tudo que o Tur salva

## 5) Logs e Diagnstico
- `docker compose logs -f`
- `logs/` e `state/` so persistidos no host

## 6) Segurana
- Grok **no executa comandos**
- Apenas scripts whitelisted podem rodar
- Memria  auditvel e transparente

## 7) Ps-setup e Capacidades
Arquivo: `src/config/capabilities.ts`
- Lista de exemplos que o Tur usa para explicar o que sabe fazer


### 3.14 Supabase Governance
Arquivos: src/core/supabaseClient.ts, src/core/supabaseDb.ts, src/core/supabaseGovernance.ts`r
- Client seguro com service_role
- SQL com guardrails (bloqueia destrutivo)
- Storage: listar/criar buckets

### 3.15 Auto-Estudo Silencioso
Arquivos: src/core/idleDetector.ts, src/core/studyEngine.ts`r
- Roda apenas em ociosidade (CPU/mem/atividade)
- Limite diario de palavras
- Registra em state/learning

## 8) Futuro (roadmap)
- Multi-canal (Telegram, Slack)
- Multi-servidor
- Plugins de skills
- UI Web / Dashboard
- Marketplace de skills

---

### TL;DR
Tur  um assistente pessoal humano, seguro e auditvel, com:
- WhatsApp + Grok
- Skills e scripts controlados
- Memria persistente
- Onboarding amigvel
- Atualizaes automticas

## 9) Ajustes recentes (cron/lembretes)
Arquivos:
- src/skills/cronSkill.ts
- src/channels/whatsapp.ts

O que foi ajustado:
- Para CRON_CREATE de lembretes, o bot nao envia o result.reply do brain para evitar respostas duplicadas.
- A resposta final vem do CronSkill com texto simples:
  "Deu tudo certo por aqui. Vou te lembrar em {tempo}, fica tranquilo."
- Em caso de erro na criacao do cron, o CronSkill retorna a mensagem com o log do erro (temporario para debug):
  "Erro ao criar o lembrete: <mensagem>\nLog: <stack ou mensagem>"

Como funciona:
- O CronSkill recebe schedule (ISO-8601 ou cron).
- Se for ISO-8601, calcula o tempo relativo (minutos/horas/dias) para montar {tempo}.
- Se nao for ISO, usa "no horario combinado".



