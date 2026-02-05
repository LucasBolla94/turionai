# BrainMap – Tur (Turion)

Este documento descreve **o que o Tur faz**, como o sistema está organizado e **onde cada parte vive no código**. A ideia é ser simples de ler, mas sem perder detalhes importantes para manutenção futura.

## 1) Visão geral (o que o Tur é)
Tur é um assistente pessoal via WhatsApp, com arquitetura segura e auditável:
- **WhatsApp** como canal principal (Baileys)
- **Cérebro (Grok)** apenas interpreta e sugere intenções/ações (nunca executa comandos)
- **Executor** roda scripts permitidos, com lista fixa
- **Memória** em JSON (fatos, decisões, projetos, tarefas)
- **Auditoria** e **conversas** registradas em disco

Fluxo base:
```
Mensagem ? Pipeline ? (Grok JSON) ? Validação ? Skill/Executor ? Log + Memória
```

## 2) O que o Tur sabe fazer hoje
### Ações principais
- **Responder mensagens** com tom humano (ajustado pelo usuário)
- **Human UX Engine**: polimento de resposta com IA + templates (varia sem repetir)
- **Executar comandos permitidos** (`--status`, `run`, `logs`, `deploy`, `redeploy` etc.)
- **Checar e resumir logs**
- **CRON** (lembretes e tarefas programadas)
- **Atualizar o próprio código** com `--update`
- **Checar status das APIs** (Grok, Email, WhatsApp)
- **Email (Gmail/iCloud)**: listar, ler, explicar, responder e apagar
- **Memória inteligente**: lembrar fatos, decisões e projetos
- **Onboarding humanizado** (primeira configuração)

### Exemplos de comandos úteis
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

## 3) Arquitetura por módulos
### 3.1 WhatsApp (entrada principal)
Arquivo: `src/channels/whatsapp.ts`
Responsável por:
- Conectar no WhatsApp
- Gerar e mostrar QR
- Reconectar em falhas
- Processar mensagens
- Chamar pipeline + brain + skills

### 3.2 Cérebro (Grok)
Arquivo: `src/core/brain.ts`
- Faz chamadas ao Grok via API
- Espera JSON estrito
- Interpreta intenção, risco e ações
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
- Roda scripts do diretório `scripts/`
- Bloqueia execução fora da whitelist

### 3.5 Skills
Diretório: `src/skills/`
- Cada funcionalidade real vira uma Skill
- Skills são executadas pelo `PlanRunner`

### 3.6 Plano (RUN_PLAN)
Arquivo: `src/core/planRunner.ts`
- Executa múltiplas skills em sequência
- Auditável e seguro

### 3.7 Memória
Arquivo: `src/core/memoryStore.ts`
- Guarda fatos, decisões, tarefas, projetos
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
- Inferência por cidade/país

### 3.11 Update automático
Arquivos:
- `scripts/update_self.sh`
- `scripts/update_check.sh`
- `src/core/updateStatus.ts`
- `src/channels/whatsapp.ts`

Cron automático checa updates a cada 5 minutos.
O cron de update é tratado como essencial: na inicialização ele é validado,
recriado se faltar e normalizado para evitar duplicação.
Quando o usuário pergunta sobre update do modelo (Grok), o bot explica que é um serviço externo e mostra o modelo configurado.

## 4) Arquivos importantes
- `docker-compose.yml` ? container principal
- `scripts/` ? scripts permitidos
- `state/` ? tudo que o Tur salva

## 5) Logs e Diagnóstico
- `docker compose logs -f`
- `logs/` e `state/` são persistidos no host

## 6) Segurança
- Grok **não executa comandos**
- Apenas scripts whitelisted podem rodar
- Memória é auditável e transparente

## 7) Pós-setup e Capacidades
Arquivo: `src/config/capabilities.ts`
- Lista de exemplos que o Tur usa para explicar o que sabe fazer


### 3.12 Supabase Governance
Arquivos: src/core/supabaseClient.ts, src/core/supabaseDb.ts, src/core/supabaseGovernance.ts`r
- Client seguro com service_role
- SQL com guardrails (bloqueia destrutivo)
- Storage: listar/criar buckets

### 3.13 Auto-Estudo Silencioso
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
Tur é um assistente pessoal humano, seguro e auditável, com:
- WhatsApp + Grok
- Skills e scripts controlados
- Memória persistente
- Onboarding amigável
- Atualizações automáticas

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



