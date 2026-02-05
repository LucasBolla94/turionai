# Brain Work - Como o Sistema Interpreta e Executa

Este documento explica, de forma simples e tecnica, como o Turion processa uma mensagem do usuario, decide a intencao e executa (ou nao) acoes.

## 1) Entrada da Mensagem (WhatsApp)
Arquivo principal: `src/channels/whatsapp.ts`

Fluxo simplificado:
1) Mensagem chega do WhatsApp.
2) Validacoes rapidas (owner setup, pending actions, comandos diretos).
3) Classificacao inicial (pipeline) para decidir se e `COMMAND`, `CHAT` ou `UNKNOWN`.
4) Se for conversa, envia ao Brain (Grok interpreta JSON).
5) A resposta final ao usuario e gerada pela Anthropic (Sonnet) quando configurada.
6) Resultado pode gerar:
   - resposta
   - execucao de Skill
   - plano com varias Skills
   - pedido de confirmacao

## Configuracao de APIs
- XAI_API_KEY: obrigatoria para interpretar intencoes (Grok).
- ANTHROPIC_API_KEY: opcional; quando configurada, gera respostas finais (Sonnet).
- Fallback: se Anthropic falhar/nao estiver configurada, Grok responde.
- Indicadores: ?? Anthropic e ?? Grok no inicio da resposta.

## 2) Classificacao Rapida (Message Pipeline)
Arquivo: `src/core/messagePipeline.ts`

Funcao:
- Separar comandos diretos (`--status`, `logs`, `deploy` etc.).
- Extrair args simples.
- Evitar gastar tokens do Brain em mensagens obvias.

## 3) Brain (Grok) - Interpretacao de Intencao
Arquivo: `src/core/brain.ts`

Como funciona:
- Envia um prompt do sistema para o Grok com regras estritas.
- O Grok retorna JSON obrigatorio (intent, args, action, reply, etc.).
- A resposta final ao usuario e gerada pela Anthropic (Sonnet) quando configurada.
- Se a Anthropic falhar ou nao estiver configurada, o Grok responde (fallback).
- O sistema nunca executa comandos diretamente do Brain sem validacao.

### Exemplo de saida esperada do Brain (JSON)
```json
{
  "intent": "CRON_CREATE",
  "args": {
    "action": "create",
    "name": "reminder_1700000000",
    "jobType": "reminder",
    "schedule": "2026-02-05T12:00:00.000Z",
    "payload": "{"to":"5511999999999","message":"beber agua"}",
    "runOnce": true
  },
  "needs_confirmation": false,
  "action": "RUN_SKILL",
  "reply": "Fechado, vou te lembrar em 10 minutos..."
}
```

## 4) Decisao e Execucao
Arquivo: `src/channels/whatsapp.ts`

Regras principais:
- Se `needs_confirmation = true`, o sistema salva como `pending` e aguarda "sim".
- Se `RUN_SKILL`, chama a skill adequada (ex: `CronSkill`, `SupabaseSkill`).
- Se `RUN_PLAN`, executa varias skills em sequencia.
- Se houver erro, tenta auto-correcoes (logs/diagnostico).

## 5) Pending Actions (Confirmacoes e Fluxos)
Arquivos: `src/core/pendingActions.ts` e `src/channels/whatsapp.ts`

Exemplos:
- OWNER_SETUP (onboarding).
- EMAIL_CONNECT_FLOW (email).
- EMAIL_DELETE_PICK/CONFIRM (quando ha ambiguidade).
- RUN_UPDATE (update).

## 6) Skills (Acoes Reais)
Diretorio: `src/skills/`

Cada Skill executa algo especifico:
- `CronSkill` -> lembretes e crons
- `EmailSkill` -> Gmail/iCloud
- `SupabaseSkill` -> SQL seguro e buckets
- `LogsSkill`, `DeploySkill`, `ScriptSkill`, etc.

As skills sao acionadas pelo Brain ou por comandos diretos do usuario.

## 7) Executor de Scripts
Arquivo: `src/executor/executor.ts`

Regras:
- Executa apenas scripts em `scripts/` com extensao `.sh` ou `.ps1`.
- Bloqueia extensoes nao permitidas.
- Controla tempo limite para evitar travas.

## 8) Cron e Automacoes
Arquivo: `src/core/cronManager.ts`

- Gerencia jobs (ex: reminders, email_monitor, update_check_5m).
- Jobs essenciais sao auto-verificados e auto-iniciados.

## 9) Update do Sistema
Arquivos: `src/core/updateAuto.ts`, `scripts/update_check.sh`, `scripts/update_self.sh`

Fluxo:
- Checa se ha update.
- Se houver, aplica update e reinicia.
- Mensagens deixam claro que o update e do proprio sistema.

## 10) Memoria e Contexto
Arquivos:
- `src/core/memoryStore.ts`
- `src/core/conversationStore.ts`

O Brain usa:
- Memoria do usuario
- Conversas recentes
- Digest diario

Isso permite entender contexto ("faz igual ontem", "isso ai").

## 11) Resumo do Fluxo
```
Mensagem -> Pipeline -> Brain (JSON) -> Validacao -> Skill/Plano -> Resposta
```

Se der erro:
- O sistema tenta auto-correcao com logs e diagnostico de IA.
