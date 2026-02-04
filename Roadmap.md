# Roadmap – Projeto Turion (Assistente Pessoal estilo OpenClaw)

> Objetivo do roadmap:
> Construir o Turion em camadas, sempre **funcionando de verdade**, testável a cada etapa,
> evitando complexidade precoce e permitindo evolução segura e escalável.

---

## FASE 0 — Preparação mental e princípios (ANTES DE CODAR)

### Objetivos
- Ter regras claras para não virar bagunça
- Evitar decisões perigosas cedo demais
- Garantir que tudo seja testável passo a passo

### Decisões fixas
- Linguagem principal: **Node.js**
- Execução 24/7: **Docker (com restart automático)** ou **PM2**
- Canal inicial: **WhatsApp (Baileys)**
- Segurança: **usuário dedicado + scripts permitidos**
- Arquitetura: **Cérebro (IA) separado do Executor**

### Resultado esperado
- Documento de visão (já feito)
- Roadmap definido (este documento)
- Nenhuma linha de código ainda

---

## FASE 1 — Estrutura base do projeto (fundação)

### Objetivo
Criar a estrutura do projeto sem funcionalidades, apenas para:
- subir
- rodar
- reiniciar
- logar

### Passos
1. Criar repositório Git (ex: `turion-core`)
2. Criar estrutura inicial de pastas:
turion/
├─ src/
│ ├─ core/
│ ├─ channels/
│ ├─ skills/
│ ├─ executor/
│ ├─ security/
│ ├─ config/
│ └─ utils/
├─ scripts/
├─ logs/
├─ state/
├─ docker-compose.yml
├─ package.json
└─ README.md

3. Criar um `index.ts` que:
- sobe o processo
- escreve “Turion iniciado”
- fica rodando (event loop vivo)

4. Criar Docker Compose mínimo:
- container Node
- restart automático
- volume para `state/` e `logs/`

### Testes
- Subir com `docker compose up -d`
- Derrubar container → verificar se sobe sozinho
- Ver logs com `docker logs`

### Resultado esperado
✅ Turion sobe, não faz nada, mas **não morre**

---

## FASE 2 — Canal WhatsApp (conexão e estabilidade)

### Objetivo
Conectar no WhatsApp e **provar que mensagens chegam no servidor**.

### Passos
1. Integrar biblioteca **Baileys**
2. Gerar QR Code no terminal/log
3. Escanear com WhatsApp
4. Salvar sessão em `state/`
5. Reconectar automaticamente ao reiniciar

### Funcionalidades mínimas
- Logar:
- conectado
- desconectado
- reconectando
- Receber mensagens (printar no log)

### Testes
- Mandar “oi” no WhatsApp
- Ver mensagem chegar no log
- Reiniciar container → NÃO pedir QR de novo
- Derrubar internet → reconectar

### Resultado esperado
✅ WhatsApp conectado 24/7  
✅ Mensagens chegam sempre

---

## FASE 3 — Filtro de segurança (quem pode falar com o Turion)

### Objetivo
Garantir que **só números autorizados** possam interagir.

### Passos
1. Criar allowlist de números (config ou DB)
2. Ignorar mensagens de números não autorizados
3. Logar tentativas bloqueadas
4. Responder opcionalmente: “Acesso não autorizado”

### Testes
- Mandar mensagem de número autorizado → aceita
- Mandar de outro número → bloqueia

### Resultado esperado
✅ Segurança mínima garantida

---

## FASE 4 — Pipeline de mensagens (entender antes de agir)

### Objetivo
Criar um fluxo claro:
**mensagem → intenção → ação (futura)**

### Passos
1. Criar módulo `MessagePipeline`
2. Separar:
- texto bruto
- remetente
- timestamp
3. Classificar mensagens simples:
- comando
- conversa
- desconhecido

### Exemplo
- “status” → intenção STATUS
- “oi” → intenção CHAT
- “deploy projeto” → intenção DEPLOY (ainda não executa)

### Testes
- Logar intenção detectada
- Nenhuma ação perigosa ainda

### Resultado esperado
✅ Turion entende *o que* foi pedido (em nível básico)

---

## FASE 5 — Executor SEGURO (sem poder destrutivo)

### Objetivo
Criar a base que executa comandos **sem risco**.

### Passos
1. Criar usuário Linux dedicado (ex: `turion`)
2. Criar pasta `/opt/turion/scripts`
3. Criar scripts simples:
- `ping.sh`
- `whoami.sh`
4. Configurar sudoers:
- permitir apenas `/opt/turion/scripts/*`

5. Criar módulo `Executor` que:
- chama scripts
- captura stdout/stderr
- retorna resultado

### Testes
- Enviar “ping”
- Script roda
- Retorna resultado no WhatsApp

### Resultado esperado
✅ Turion executa coisas **sem risco**

---

## FASE 6 — Primeiros comandos reais (botões)

### Objetivo
Ter comandos úteis, simples e seguros.

### Comandos iniciais
- `status` → mostra uptime, container, memória
- `list scripts` → lista botões disponíveis
- `run <script>` → executa script permitido

### Testes
- Rodar cada comando
- Ver resposta clara no WhatsApp

### Resultado esperado
✅ Turion já “trabalha” de verdade

---

## FASE 7 — CRON Jobs (tarefas automáticas) + Base do “Token Saver” ✅

### Objetivo
Permitir tarefas agendadas **e já preparar o sistema para economizar tokens** com:
- persistência de eventos
- geração de resumos
- rotina diária de organização

### Passos (CronManager)
1. Usar `node-cron` (interno)
2. Criar `CronManager` com:
   - `createCron(name, schedule, jobType, payload)`
   - `listCrons()`
   - `pauseCron(name)`
   - `removeCron(name)`
3. Persistir crons em `state/crons/crons.json`

### NOVO: Base do Token Saver (sem Grok ainda)
Criar estrutura para armazenar logs e conversas em formato barato:
- `state/conversations/` (jsonl)
- `state/digests/` (resumos diários)
- `state/memory/` (memórias organizadas)
- `state/cache/` (cache de respostas/resumos)

### Estrutura de arquivos (recomendado)
state/
├─ crons/
│  └─ crons.json
├─ conversations/
│  └─ YYYY-MM-DD/
│     └─ thread_<id>.jsonl
├─ digests/
│  └─ YYYY-MM-DD.json
├─ memory/
│  ├─ memory.json
│  └─ keyword_index.json
└─ cache/
   ├─ llm_responses.json
   └─ summaries.json

### Testes
- Criar cron de teste (log a cada 1 min)
- Ver execução real
- Pausar e remover
- Ver crons persistindo após restart

### Resultado esperado
✅ Turion executa tarefas sozinho  
✅ Estrutura pronta para economia de tokens

---

## FASE 8 — Brain com GROK (JSON estrito) + Respostas melhores (sem riscos) ✅

### Objetivo
Integrar Grok como **Cérebro** para:
- interpretar melhor comandos
- gerar respostas mais humanas
- retornar **JSON estrito** para o Turion tomar decisões
- sem executar nada diretamente

### Regra crítica (igual OpenClaw)
- Grok **NUNCA** executa shell
- Grok apenas:
  1) interpreta
  2) propõe intenção/args
  3) sugere perguntas
  4) (no máximo) cria um plano de skills

### Componentes novos
- `src/brain/grokClient.ts` (chamada à API)
- `src/brain/prompt.ts` (system prompt + regras)
- `src/brain/schema.ts` (validador do JSON)
- `src/brain/planner.ts` (converte msg → JSON)
- `src/brain/guard.ts` (bloqueios / fallback)

### Contrato JSON do Brain (MVP)
O Grok deve responder exatamente:
```json
{
  "reply": "texto para o WhatsApp",
  "intent": "STATUS|RUN_SCRIPT|DEPLOY|LOGS|CRON_CREATE|CHAT|UNKNOWN",
  "args": {},
  "needs_confirmation": false,
  "questions": [],
  "risk": "low|medium|high",
  "action": "NONE|ASK|RUN_SKILL|RUN_PLAN",
  "plan": []
}
Persistir conversas (para memória e auditoria)
Cada mensagem (entrada/saída) vira 1 linha JSONL:
state/conversations/YYYY-MM-DD/thread_<id>.jsonl

Exemplo (linha):

{"ts":"...","from":"+44...","text":"redeploy projeto x","intent":"DEPLOY","args":{"project":"x"},"reply":"Confirmar redeploy do projeto x?","action":"ASK","risk":"medium","status":"ok"}
Testes
“status” → Grok retorna JSON com intent STATUS e reply bonito

“deploy projeto” → Grok pergunta repo/domínio

“apaga tudo” → bloqueio + log

Resultado esperado
✅ Turion entende linguagem natural
✅ Respostas melhores sem risco
✅ Conversas gravadas para memória e token saver

### FASE 9 — Deploy simples de projetos (MVP) + “Project Registry” (economia real) ✅
Objetivo
Fazer deploy real (como antes), mas agora com:

registro do projeto (nome/repo/stack/porta)

padrão fixo de deploy


Escopo inicial
Apenas Docker Compose

Projetos locais ou GitHub público - Instala e configura a biblioteca git para podermos ter acesso 

Passos
Script deploy_compose.sh (whitelist)

Clonar repo (pasta padrão: /opt/turion/projects/<projectName>)

Rodar docker compose up -d

Ver status do container

Retornar resultado no WhatsApp

NOVO: Project Registry
Após primeiro deploy, salvar:
state/memory/projects.json (ou dentro do memory.json)

Exemplo:

{
  "projects": [
    {
      "name":"nexlyai-builder",
      "repo_url":"https://github.com/.../nexlyai-builder",
      "path":"/opt/turion/projects/nexlyai-builder",
      "deploy":"docker-compose",
      "ports":[3000],
      "domains":[],
      "last_deploy_ts":"..."
    }
  ]
}
Integração com Grok (token saver)
Quando o usuário disser:

“redeploy o nexlyai-builder”
o Turion usa o registry e não precisa perguntar repo/path.

Testes
Deploy de projeto simples

Atualizar e redeploy

Re-deploy sem repetir perguntas

Resultado esperado
✅ Turion faz deploy de verdade
✅ Guarda dados do projeto (economiza tokens)
✅ Fluxo mais “OpenClaw-like”

### FASE 10 — Logs e diagnóstico (melhorado com Grok) + Limites de tokens ✅
Objetivo
Manter a skill de logs, mas melhorar com Grok:

resumir erro

apontar causa provável

sugerir ações seguras

limitar o volume para economizar tokens

Passos (LogsSkill)
Comando logs <projeto> [lines]

Buscar logs Docker/PM2

Limitar retorno (ex: 200 linhas ou 20 KB)

Mostrar erro claro

NOVO: DiagnoseMode (com Grok)
Quando falhar:

coletar logs limitados

enviar para Grok para JSON:

{
  "summary":"...",
  "probable_cause":"...",
  "safe_next_steps":[
    {"skill":"StatusSkill","args":{"project":"x"}},
    {"skill":"LogsSkill","args":{"project":"x","lines":120}}
  ],
  "needs_confirmation": false
}
Token saver aplicado
Nunca enviar logs gigantes pro Grok

Sempre:

cortar

remover repetição

enviar apenas trecho relevante

Testes
Quebrar projeto de propósito

Ver resumo do erro (humano)

Ver sugestão segura

Resultado esperado
✅ Turion ajuda a debugar (muito melhor)
✅ Sem gastar tokens à toa com logs enormes

 ### FASE 11 — Estrutura de Skills (organização) + Router por Plano (OpenClaw style) ✅
Objetivo
Transformar tudo em skills e permitir execução composta:

Grok monta um plan

Turion valida e executa passo a passo

Passos
Criar Skills:

DeploySkill

CronSkill

LogsSkill

StatusSkill

ScriptSkill (run <script>)

Interface padrão:

canHandle(intent)

execute(args, ctx)

Registry automático de skills (autoload)

NOVO: Plan Runner
Grok pode retornar:

action: RUN_PLAN

plan: [{skill,args}, ...]

Turion:

valida skills permitidas

valida args

roda em sequência

loga tudo no AuditLog

Exemplo
Usuário: “redeploy e me traz logs”
Grok:

{
  "reply":"Vou redeployar e trazer os logs. Confirmar?",
  "intent":"REDEPLOY_AND_LOGS",
  "needs_confirmation": true,
  "risk":"medium",
  "action":"RUN_PLAN",
  "plan":[
    {"skill":"DeploySkill","args":{"project":"nexlyai-builder","mode":"redeploy"}},
    {"skill":"LogsSkill","args":{"project":"nexlyai-builder","lines":120}}
  ]
}
Resultado esperado
✅ Organização total
✅ Execução composta e previsível
✅ Estilo OpenClaw

### FASE 12 — Auditoria e histórico + “Conversation Digest” (Token Saver real) ✅
Objetivo
Registrar tudo (como antes), mas agora com:

histórico de ações

histórico de conversa

digest diário

cache de contexto
=> reduzindo chamadas repetidas ao Grok

Passos (AuditLog)
Criar AuditLog

Registrar:

quem pediu

o que foi feito

quando

resultado

risco

confirmação (sim/não)

Persistir em JSON (MVP):
state/audit/YYYY-MM-DD.jsonl

NOVO: Digest por conversa
A cada X mensagens (ex: 10) ou ao final do dia:

gerar um mini-resumo da thread

salvar em state/digests/YYYY-MM-DD.json

Formato:

{
  "date":"YYYY-MM-DD",
  "threads":[
    {
      "thread_id":"thread_123",
      "summary":"Hoje você redeployou X, ajustou Y...",
      "keywords":["deploy","logs","nginx"]
    }
  ]
}
Token saver aplicado
No próximo prompt ao Grok:

enviar só:

últimas 3–5 mensagens

resumo da thread

memórias relevantes por keyword

NUNCA enviar conversa inteira

Resultado esperado
✅ Histórico completo e confiável
✅ Menos tokens gastos em contexto gigante
✅ Turion “lembra” sem repetir tudo

### FASE 13 — Memória Inteligente (JSON) + Index por Palavras-chave (busca rápida) ✅
Objetivo
Criar memória persistente tipo “OpenClaw”:

fatos

decisões

projetos

preferências
com index por keywords para recuperação rápida.

Estrutura state/memory/memory.json
{
  "facts": [],
  "decisions": [],
  "projects": [],
  "preferences": [],
  "tasks": [],
  "meta": {"last_updated":"..."}
}
Index por keyword
state/memory/keyword_index.json

{
  "deploy":["decision_1","project_2"],
  "grok":["decision_3"]
}
Regras
Memória não é tudo: é só o que é útil

Cada item tem weight (importância)

Evitar duplicatas

Testes
“qual domínio do ollama mesmo?” → responde com base na memória

“como foi feito o deploy do projeto X?” → puxa do project registry

Resultado esperado
✅ Memória real, rápida e barata
✅ Contexto forte com poucos tokens

FASE 14 — CRON diário (1x/dia) com Grok para organizar memórias (Keyword Organizer) ✅
Objetivo
Objetivo
1 vez por dia (ex: 03:30):

ler conversas das últimas 24h

gerar digest do dia

extrair memórias úteis (facts/decisions/projects/tasks)

deduplicar

criar keywords inteligentes

atualizar weights

salvar tudo em JSON

Passos
Criar cron fixo: memory_organizer_daily

Job executa:

carregar conversas do dia (jsonl)

reduzir volume (chunk + compact)

enviar para Grok pedindo JSON estrito:

digest

new_memories

updates

dedupe

keyword_index_updates

aplicar merge seguro (sem apagar tudo)

salvar:

state/digests/YYYY-MM-DD.json

state/memory/memory.json

state/memory/keyword_index.json

logar auditoria do cron

JSON esperado do Grok (organizer)
{
  "digest":"Resumo do dia...",
  "new_memories":{
    "facts":[{"text":"...","keywords":["..."],"weight":0.7}],
    "decisions":[{"text":"...","keywords":["..."],"weight":1.0}],
    "projects":[{"name":"...","repo_url":"...","keywords":["..."]}],
    "tasks":[{"text":"...","keywords":["..."],"weight":0.6}]
  },
  "updates":[{"type":"project","match":"nexlyai-builder","patch":{"last_deploy_ts":"..."}}],
  "dedupe":[{"drop_text":"...","keep_text":"...","reason":"same meaning"}],
  "keyword_index_updates":{"deploy":["project_1","decision_2"]}
}
Regras críticas
Organizer NÃO executa comandos

Só reorganiza memória + digest

Tudo auditado

Resultado esperado
✅ Memória organizada automaticamente
✅ Turion fica cada dia melhor
✅ Economia forte de tokens

### FASE 15 — “Dar Vida ao Agente” (Contexto, Lembretes e Email Inteligente) ✅

Objetivo
Transformar o Turion de um agente técnico extremamente sólido em um
**assistente pessoal vivo**, contextual, proativo e útil no dia a dia,
sem quebrar segurança, auditoria ou economia de tokens.

Nesta fase, o foco NÃO é infraestrutura,
mas sim **compreensão de intenção humana**, memória prática
e interação natural com tarefas do mundo real (tempo, email, lembretes).

Nada executa sem passar por:
JSON → Validação → Skill → Executor → AuditLog

---

## 15.1 — Compreensão de linguagem natural com contexto temporal

Objetivo
Permitir que o Turion entenda pedidos humanos comuns como:
- “me lembra amanhã”
- “me lembra disso depois”
- “daqui a pouco”
- “toda segunda”
mesmo quando o usuário **não especificar horário exato**.

Regras
- Se o usuário NÃO informar horário:
  → usar o horário atual como base
- Se o usuário NÃO informar data:
  → inferir pelo contexto (amanhã, depois, semana que vem)
- Tudo deve virar um CRON explícito e auditável

Exemplo
Usuário:
“Me lembra de pagar o HMRC amanhã”

Turion (via Grok JSON):
{
  "intent":"CRON_CREATE",
  "args":{
    "type":"reminder",
    "message":"Pagar HMRC",
    "schedule":"2026-02-05T14:00:00"
  },
  "risk":"low",
  "needs_confirmation":false,
  "action":"RUN_SKILL"
}

Resultado
- Cron criado automaticamente
- Persistido em state/crons
- Auditado
- Executa no horário correto
- Envia lembrete no WhatsApp

---

## 15.2 — CRON por linguagem natural (Reminder Intelligence)

Objetivo
Permitir que o usuário crie lembretes falando como humano,
sem precisar entender cron syntax.

Exemplos aceitos
- “me lembra disso amanhã”
- “me lembra sexta”
- “me lembra todo dia às 9”
- “me lembra daqui 2 horas”
- “me lembra de checar os emails todo dia”

Pipeline
Mensagem → Grok → JSON estruturado → CronSkill → CronManager

Regras críticas
- Grok NUNCA cria cron diretamente
- Grok apenas propõe:
  - schedule normalizado
  - tipo do cron
  - payload
- Turion valida tudo antes de criar

Resultado esperado
✅ Lembretes naturais
✅ Zero complexidade para o usuário
✅ Totalmente auditável

---

## 15.3 — Entendimento contextual de conversas (Context Awareness)

Objetivo
Fazer o Turion entender pedidos levando em conta:
- últimas mensagens
- resumo da thread (Digest)
- memórias relevantes por keyword

Exemplo
Usuário:
“faz isso amanhã”

Turion entende:
- “isso” → última task mencionada
- “amanhã” → data inferida
- horário → horário atual

Regra de Token Saver
Nunca enviar conversa inteira ao Grok.
Enviar apenas:
- últimas 3–5 mensagens
- digest da thread
- memórias relacionadas

Resultado esperado
✅ Conversas naturais
✅ Menos perguntas repetidas
✅ Menos tokens

---

## 15.4 — Integração com Email (Gmail e Apple iCloud)

Objetivo
Permitir que o Turion:
- configure emails do usuário
- leia emails novos
- explique emails
- responda emails
- delete emails
tudo com segurança e controle.

Tipos suportados (MVP)
- Gmail
- Apple iCloud Mail

---

### 15.4.1 — Configuração de Email Apple iCloud (App Password)

Fluxo
1. Turion ensina o usuário a criar a senha de app
2. Usuário fornece:
   - email
   - app password
3. Turion valida conexão
4. Salva configuração de forma segura
5. Ativa monitoramento opcional por cron

Passos ensinados ao usuário (Apple)
1️⃣ Criar senha de app no Apple ID

Entrar em:
https://appleid.apple.com

Login → Sign-In and Security
→ App-Specific Passwords
→ Generate Password

Nome sugerido:
Turion Assistant Mail

⚠️ A senha aparece apenas uma vez.

---

### 15.4.2 — Configurações oficiais iCloud Mail

IMAP (leitura)
Host: imap.mail.me.com
Port: 993
Security: SSL/TLS

SMTP (envio)
Host: smtp.mail.me.com
Port: 587
Security: STARTTLS

Credenciais
User: email@icloud.com
Password: APP_PASSWORD

---

### 15.4.3 — Stack técnica Node.js (Email)

Bibliotecas recomendadas
- imap-simple (leitura IMAP)
- mailparser (parse e-mails)
- nodemailer (envio SMTP)

Exemplo de uso (conceito)
- EmailSkill.connect()
- EmailSkill.checkNew()
- EmailSkill.read(id)
- EmailSkill.reply(id, content)
- EmailSkill.delete(id)

Tudo auditado.
Nada automático sem permissão do usuário.

---

## 15.5 — Leitura inteligente e explicação de emails (Email AI)

Objetivo
Quando o usuário perguntar:
“chegou algum email novo?”
“explica esse email”
“o que essa pessoa quer?”

Fluxo
- Turion busca emails novos
- Mostra lista organizada:
  - remetente
  - assunto
  - data
- Se solicitado:
  - envia conteúdo ao Grok
  - Grok retorna explicação em linguagem humana
  - sem executar nenhuma ação

Formato de resposta bonito e claro no WhatsApp.

---

## 15.6 — Resposta automática de emails (com controle total)

Objetivo
Permitir responder emails com qualidade profissional.

Regras
- Sempre usar tom formal de email
- Linguagem definida pelo usuário
- Nunca enviar sem confirmação (por padrão)
- Grok apenas escreve o rascunho
- Turion envia via SMTP

Exemplo
Usuário:
“responde dizendo que recebi e retorno amanhã”

Grok retorna:
{
  "subject":"Re: ...",
  "body":"Dear ..., Thank you for your email..."
}

Turion:
- mostra preview
- pede confirmação
- envia
- registra auditoria

---

## 15.7 — Monitoramento automático de emails (Cron)

Objetivo
Permitir que o usuário diga:
“verifica meus emails a cada 30 minutos”
“me avisa se chegar algo importante”

Fluxo
- Criar cron via linguagem natural
- Checar emails
- Filtrar (ex: unread)
- Notificar no WhatsApp

Tudo configurável.
Nada oculto.

---

## Resultado final da FASE 15

✅ Turion entende tempo e contexto  
✅ Turion cria lembretes sozinho  
✅ Turion interage com email de forma profissional  
✅ Turion explica emails como um assistente humano  
✅ Turion responde emails corretamente  
✅ Tudo auditável, seguro e econômico em tokens  
✅ Agora sim o agente “ganha vida”

PRINCÍPIO MANTIDO
IA pensa → Turion decide → Skill executa → Executor limitado → AuditLog registra


### FASE 16 — Inteligência Avançada, Humanização e Aprendizado de Conversa

Objetivo
Elevar o Turion ao nível de um **assistente pessoal experiente, humano e adaptável**,
capaz de entender prompts complexos, ambíguos ou incompletos,
agir corretamente com base em contexto,
e evoluir seu jeito de conversar ao longo do tempo
sem re-treinar modelos nem gastar tokens excessivos.

Esta fase NÃO adiciona poderes perigosos.
Ela apenas melhora:
- entendimento
- comunicação
- empatia
- previsibilidade

Tudo continua passando por:
JSON → Validação → Skill → Executor → AuditLog

---

## 16.1 — Entendimento avançado de prompts (Prompt Intelligence Layer)

Objetivo
Permitir que o Turion entenda corretamente pedidos como:
- mensagens vagas
- comandos incompletos
- frases ambíguas
- pedidos em sequência
- misto de conversa + ação

Exemplos
- “depois faz aquele deploy”
- “vê isso pra mim”
- “acho que deu erro”
- “quero fazer igual da outra vez”

Pipeline aprimorado
Mensagem →
Context Resolver →
Intent Refinement →
Action Planner →
( só então ) Grok JSON

Componentes novos
- PromptResolver
- ContextResolver
- IntentRefiner

Funções
- Resolver pronomes (“isso”, “aquilo”, “ele”)
- Inferir ação com base no histórico
- Detectar se o usuário quer:
  - ação imediata
  - explicação
  - confirmação
  - só conversar

Resultado esperado
✅ Menos perguntas desnecessárias  
✅ Ações mais corretas  
✅ Experiência fluida

---

## 16.2 — Camada de personalidade e emoções leves (Behavior Engine)

Objetivo
Dar ao Turion um **jeito de falar consistente**, humano e adaptável,
sem criar “personalidade caótica”.

Princípio
O Turion NÃO muda quem ele é.
Ele apenas ajusta:
- tom
- informalidade
- empatia
- vocabulário

Componentes
- behavior_profile.json
- emotion_state.json

Exemplo behavior_profile
{
  "tone":"friendly",
  "formality":"mixed",
  "emoji_level":0.2,
  "humor":"light",
  "verbosity":"medium"
}

Emotion State (leve e transitório)
{
  "mood":"neutral",
  "energy":0.6,
  "last_interaction":"2026-02-04T12:10:00"
}

Regras
- Emoções NÃO afetam decisões técnicas
- Emoções só influenciam resposta textual
- Emoções decaem com o tempo

Resultado esperado
✅ Respostas mais humanas  
✅ Sem risco de comportamento estranho  

---

## 16.3 — Aprendizado incremental do jeito do usuário (Vocabulary Learning)

Objetivo
Fazer o Turion **aprender como o usuário fala**
e se adaptar gradualmente.

O que pode ser aprendido
- gírias frequentes
- nível de formalidade
- frases preferidas
- idioma padrão
- comprimento médio das mensagens

Como aprender (barato)
- análise estatística simples
- sem IA pesada
- sem embeddings caros

Exemplo
state/memory/preferences.json
{
  "preferred_language":"pt-BR",
  "avg_message_length":"short",
  "emoji_usage":true,
  "formality":"casual",
  "common_phrases":["blz","manda bala","fechado"]
}

Uso
Essas preferências são:
- aplicadas automaticamente nas respostas
- enviadas ao Grok apenas como metadados curtos

Resultado esperado
✅ Conversa natural
✅ Sensação de “me entende”
✅ Zero desperdício de tokens

---

## 16.4 — Crons automáticos de interação humana (Defaults)

Objetivo
Dar “presença” ao Turion sem ser invasivo.

Cron padrão
- 3 vezes ao dia
- horários aleatórios entre:
  09:00 e 20:00
- mensagens curtas, humanas e variadas

Exemplo de mensagens
- “E aí {name}, como tá indo por aí?”
- “Passando só pra ver se tá tudo certo 🙂”
- “Se precisar de algo, tô por aqui.”
- “Como foi o dia até agora?”

Regras
- Nunca repetir frase no mesmo dia
- Pausar automaticamente se:
  - usuário pedir
  - usuário estiver inativo
- Tudo configurável e desativável

Persistência
Cron salvo como:
interaction_checkin_default

Resultado esperado
✅ Assistente presente
✅ Não invasivo
✅ Sensação de companhia real

---

## 16.5 — Ajuste automático de comportamento por feedback implícito

Objetivo
Permitir que o Turion se ajuste sem o usuário precisar configurar nada.

Sinais analisados
- respostas curtas vs longas
- demora para responder
- respostas ignoradas
- pedidos diretos de “seja curto”
- elogios ou correções

Exemplo
Usuário:
“responde mais curto”

Turion:
- ajusta verbosity
- salva preferência
- não pergunta nada

Resultado esperado
✅ Menos atrito
✅ Aprendizado natural
✅ Evolução contínua

---

## 16.6 — Controle de custos e estabilidade emocional (Token Safe)

Objetivo
Garantir que a humanização NÃO exploda tokens.

Regras
- Emoções e vocabulário:
  → resolvidos localmente
- Grok só recebe:
  - intent
  - resumo
  - preferências compactas
- Nada de conversa longa enviada inteira

Resultado esperado
✅ Mesmo custo
✅ Melhor experiência

---

## Resultado final da FASE 16

✅ Turion entende prompts vagos e humanos  
✅ Turion executa ações corretas com menos perguntas  
✅ Turion conversa de forma natural  
✅ Turion aprende o jeito do usuário ao longo do tempo  
✅ Turion cria presença sem ser invasivo  
✅ Tudo previsível, auditável e seguro  
✅ Zero quebra das fases anteriores  

PRINCÍPIO MANTIDO
IA interpreta → Turion decide → Skill executa → Executor limitado → AuditLog registra
