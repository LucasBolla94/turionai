# Brain Map (Code) — Turion

Este documento registra como o Turion foi estruturado e como o fluxo funciona hoje, para manutencao futura.

## Visao geral
- O Turion e um assistente pessoal por WhatsApp.
- A IA (Grok) so interpreta e gera texto/JSON. Nada executa fora da camada de skills/scripts.
- Tudo importante e auditavel em arquivos locais (JSON/JSONL).

## Arquitetura principal
1) **Canal (WhatsApp)**
   - Arquivo: `src/channels/whatsapp.ts`
   - Entrada de mensagens, validacao de dono, fluxo de onboarding, intents e respostas.

2) **Brain (Grok)**
   - Arquivo: `src/core/brain.ts`
   - Chamada ao Grok com JSON estrito.
   - Regras de resposta humana, curta e estruturada.

3) **Skills/Executor**
   - Arquivo: `src/executor/executor.ts`
   - Apenas scripts em `scripts/` com extensao `.sh` ou `.ps1`.
   - `runScript` aceita nome sem extensao e resolve automaticamente.

4) **Acoes (Action Executor)**
   - Arquivo: `src/core/actionExecutor.ts`
   - Permite `create_dir`, `write_file`, `run_script` e `read_file`.
   - `read_file` e limitado a `logs/` e `state/`, com limite de bytes.

5) **Memoria + Digest**
   - Arquivos: `src/core/memoryStore.ts`, `src/core/conversationStore.ts`, `src/core/memoryOrganizer.ts`
   - Conversa bruta em JSONL: `state/conversations/YYYY-MM-DD/`
   - Digest com estrutura fixa: `summary`, `current_goal`, `last_action`, `next_step`
   - Memoria em categorias:
     - `user_facts`
     - `project_facts`
     - `decisions`
     - `running_tasks`
   - Index por palavra-chave em `state/memory/keyword_index.json`

## Onboarding e pareamento (primeiro uso)
- Arquivo: `src/core/owner.ts`
- Ao gerar QR, o sistema cria um **codigo de pareamento** e imprime no terminal.
- O usuario precisa enviar esse codigo no WhatsApp.
- Quem envia vira o **dono** (`owner_jid`).
- Fluxo de setup pergunta:
  1) Nome
  2) Area/ocupacao
  3) XAI_API_KEY (Grok)
  4) Preferencia de tom
  5) Fuso horario
  6) Idioma
  7) Objetivos
- Ao final, mensagem de boas-vindas personalizada.

Arquivos envolvidos:
- `src/channels/whatsapp.ts` (fluxo)
- `src/core/pendingActions.ts` (estado do setup)
- `src/core/owner.ts` (persistencia do dono)

## QR Code e reconexao
- Quando a sessao do WhatsApp cai com `loggedOut`, o sistema apaga `state/baileys` e gera novo QR.
- Isso permite trocar numero ou refazer pareamento automaticamente.

## Atualizacoes automaticas
- Cron `update_check_10m` (a cada 10 minutos).
- Se encontrar update:
  - avisa o usuario com mensagem humana
  - executa update automaticamente
  - reinicia e envia mensagem humanizada quando voltar

## Logs e diagnostico
- O LLM pode **ler logs** via `read_file` (somente logs/state).
- Pode sugerir correcoes e gerar script/codigo seguro.
- Execucao real continua limitada a scripts em `scripts/`.

## Auditabilidade
- Tudo e registrado em arquivos locais.
- Sem estado oculto.
- Qualquer mudanca importante passa por JSON + validação + script.

---

Se precisar detalhar uma area especifica, crie uma secao nova aqui e referencie os arquivos correspondentes.