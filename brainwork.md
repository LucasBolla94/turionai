# Brain Work — Como o Sistema Interpreta e Executa

Este documento explica, de forma simples e técnica, como o Turion processa uma mensagem do usuário, decide a intenção e executa (ou não) ações.

## 1) Entrada da Mensagem (WhatsApp)
Arquivo principal: `src/channels/whatsapp.ts`

Fluxo simplificado:
1) Mensagem chega do WhatsApp.
2) Validações rápidas (owner setup, pending actions, comandos diretos).
3) Classificação inicial (pipeline) para decidir se é `COMMAND` ou conversa.
4) Se for conversa, envia ao Brain.
5) Resultado do Brain pode gerar:
   - resposta
   - execução de Skill
   - plano com várias Skills
   - pedido de confirmação

## 2) Classificação Rápida (Message Pipeline)
Arquivo: `src/core/messagePipeline.ts`

Função:
- Separar comandos diretos (`--status`, `logs`, `deploy` etc.).
- Extrair args simples.
- Evitar gastar tokens do Brain em mensagens óbvias.

## 3) Brain (Grok) — Interpretação de Intenção
Arquivo: `src/core/brain.ts`

Como funciona:
- Envia um prompt do sistema para o Grok com regras estritas.
- O Grok retorna JSON obrigatório (intent, args, action, reply, etc.).
- O sistema nunca executa comandos diretamente do Brain sem validação.

### Exemplo de saída esperada do Brain (JSON):
```json
{
  "intent": "CRON_CREATE",
  "args": {
    "action": "create",
    "name": "reminder_1700000000",
    "jobType": "reminder",
    "schedule": "2026-02-05T12:00:00.000Z",
    "payload": "{\"to\":\"5511999999999\",\"message\":\"beber agua\"}",
    "runOnce": true
  },
  "needs_confirmation": false,
  "action": "RUN_SKILL",
  "reply": "Fechado, vou te lembrar em 10 minutos. Quer que eu siga?"
}
```

## 4) Decisão e Execução
Arquivo: `src/channels/whatsapp.ts`

Regras principais:
- Se `needs_confirmation = true`, o sistema salva como `pending` e aguarda “sim”.
- Se `RUN_SKILL`, chama a skill adequada (ex: `CronSkill`, `SupabaseSkill`).
- Se `RUN_PLAN`, executa várias skills em sequência.

## 5) Skills (Ações Reais)
Diretório: `src/skills/`

Cada Skill executa algo específico:
- `CronSkill` → lembretes e crons
- `EmailSkill` → Gmail/iCloud
- `SupabaseSkill` → SQL seguro e buckets
- `LogsSkill`, `DeploySkill`, `ScriptSkill`, etc.

As skills são acionadas pelo Brain ou por comandos diretos do usuário.

## 6) Segurança
Camadas:
- Whitelist de scripts
- Guardrails para SQL destrutivo no Supabase
- Confirmação obrigatória em ações de risco
- Auditoria em logs e state

## 7) Memória e Contexto
Arquivos:
- `src/core/memoryStore.ts`
- `src/core/conversationStore.ts`

O Brain usa:
- Memória de usuário
- Conversas recentes
- Digest diário

Isso permite entender contexto (“faz igual ontem”, “isso aí”).

## 8) Resumo do Fluxo
```
Mensagem -> Pipeline -> Brain (JSON) -> Validacao -> Skill/Plano -> Resposta
```

Se der erro:
- O sistema tenta auto-correção com logs e diagnóstico de IA.

---

Se quiser, posso adicionar exemplos prontos de prompts e respostas esperadas para treinar o comportamento do Brain.  
