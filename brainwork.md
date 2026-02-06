📋 Visão Geral do Projeto
Turion é um assistente pessoal via WhatsApp que usa:

Canal: WhatsApp (biblioteca Baileys)
IA: Grok (xAI) como principal + Anthropic Claude como secundário
Execução: Docker/Compose
Armazenamento: Arquivos JSON/JSONL locais
🔄 FLUXO COMPLETO DE PROCESSAMENTO DE MENSAGENS
1. RECEBIMENTO DA MENSAGEM
whatsapp.ts:665


Usuário envia msg → WhatsApp (Baileys) → evento "messages.upsert"
Validações iniciais:

✅ Verifica se não é mensagem enviada pelo bot (fromMe)
✅ Verifica se já foi processada (deduplicação via seenMessages)
✅ Verifica autorização (allowlist ou owner)
✅ Extrai o texto da mensagem
⏳ Inicia indicador de "digitando..."
2. CLASSIFICAÇÃO DA MENSAGEM
messagePipeline.ts:51

A função classifyMessage() determina o intent básico:


COMMAND  → começa com / ou -- ou palavra-chave (deploy, logs, cron, etc)
CHAT     → saudações (oi, olá, bom dia, etc)
UNKNOWN  → qualquer outra coisa
Exemplo:

/status → COMMAND
Oi, tudo bem? → CHAT
Configure meu email → UNKNOWN (vai pro brain)
3. ROTEAMENTO
whatsapp.ts:936-962


if (result.intent === "COMMAND") {
    → handleCommand()  // Executa comandos diretos
} else {
    → handleBrain()    // Processa via IA
}
4. PROCESSAMENTO PELA IA (handleBrain)
whatsapp.ts:1498-2111

Aqui acontece a MÁGICA 🧠:

4.1. Preparação do Contexto
whatsapp.ts:1824-1845

Coleta informações para enviar à IA:


📌 Timestamp atual + timezone
📌 Resumo da conversa (digest) - últimas 5 mensagens
📌 Contexto de memória (facts, projetos, decisões)
📌 Mensagem do usuário
4.2. Interpretação pela IA
brain.ts:214-271 - interpretStrictJson()

Fluxo duplo de IA:


1️⃣ PRIMEIRA CHAMADA - Grok (xAI):
   └─ Recebe: todo o contexto montado
   └─ Retorna: JSON estruturado com:
       {
         intent: "EMAIL_LIST",
         args: { action: "list", limit: 10 },
         needs_confirmation: false,
         action: "RUN_SKILL",
         reply: "Vou listar seus emails...",
         missing: [],
         questions: []
       }

2️⃣ SEGUNDA CHAMADA - Claude (Anthropic) [OPCIONAL]:
   └─ Se responseRouter decidir usar Anthropic
   └─ Recebe: resultado do Grok + mensagem original
   └─ Refina o reply (resposta mais natural)
   └─ Retorna: texto polido em português
Prompts usados:

Grok:

Nome do assistente
Estrutura de resposta (reconhecimento + resposta + exemplo + próximo passo)
Regras de formatação JSON
Mapeamento de intents (EMAIL_, CRON_, SUPABASE_*, etc)
Limites de segurança (apenas logs/ e state/)
Claude:

Recebe o JSON do Grok
Foca em melhorar a resposta (reply)
Mantém tom amigável e profissional
5. DECISÃO DE AÇÃO
whatsapp.ts:1846-2110

Com base no resultado da IA, o sistema decide:

5.1. Se action = "NONE"

→ Apenas envia reply (resposta de chat)
→ FIM
5.2. Se action = "ASK"

→ Envia reply com perguntas
→ Armazena pending action
→ Aguarda resposta do usuário
→ FIM
5.3. Se action = "RUN_SKILL"

→ Verifica needs_confirmation
   ├─ SIM: Armazena pending → Envia "Confirma?"
   └─ NÃO: Executa skill imediatamente
5.4. Se action = "RUN_PLAN"

→ Executa múltiplas skills em sequência
→ Cada skill no array plan[]
6. EXECUÇÃO DE SKILLS
registry.ts + planRunner.ts

Skills disponíveis:

StatusSkill: info do sistema
ScriptSkill: executa scripts
DeploySkill: deploy de projetos
LogsSkill: lê logs
CronSkill: gerencia cron jobs
EmailSkill: gerencia emails
SupabaseSkill: queries no Supabase
Exemplo de execução:


// IA retornou: { intent: "EMAIL_LIST", action: "RUN_SKILL" }
const skill = findSkillByIntent("EMAIL_LIST")  // → EmailSkill
const result = await skill.execute(
    { action: "list", limit: 10, unreadOnly: true },
    { platform: "linux" }
)
// result = { ok: true, output: "📧 Você tem 3 emails..." }
7. RESPOSTA FINAL
whatsapp.ts:2113 - sendAndLog()


1. Polish reply (aplica estilo do usuário via behavior.ts)
2. Envia mensagem no WhatsApp
3. Registra na conversação (JSONL)
4. Para indicador "digitando..."
🎯 EXEMPLO COMPLETO DE FLUXO
Usuário: "Me lembra em 10 minutos de ligar pro João"


1️⃣ RECEBIMENTO
   └─ WhatsApp captura → valida autorização

2️⃣ CLASSIFICAÇÃO
   └─ classifyMessage() → intent: UNKNOWN

3️⃣ ROTEAMENTO
   └─ handleBrain()

4️⃣ CONTEXTO
   └─ Monta: timestamp, conversas recentes, memória

5️⃣ IA (Grok)
   └─ Interpreta: "criar lembrete de 10min"
   └─ Retorna JSON:
       {
         intent: "CRON_CREATE",
         action: "RUN_SKILL",
         args: {
           jobType: "reminder",
           schedule: "2026-02-06T15:23:00Z",
           payload: '{"to":"5511999...", "message":"ligar pro João"}',
           runOnce: true
         },
         reply: "🅣 Fechado. Vou te lembrar em 10 minutos.",
         needs_confirmation: false
       }

6️⃣ EXECUÇÃO
   └─ CronSkill.execute()
   └─ Cria cron job → salva em state/crons/

7️⃣ RESPOSTA
   └─ Envia: "🅣 Fechado. Vou te lembrar em 10 minutos. Agora são 15:13."
   └─ Registra conversação
🔐 SISTEMA DE CONFIRMAÇÃO (Pending Actions)
pendingActions.ts

Quando needs_confirmation: true:


1. Armazena pending action em state/pending/
2. Envia "Confirma? Me responde com 'sim' ou 'nao'."
3. Aguarda próxima mensagem
4. Se "sim" → executa pending
5. Se "não" → limpa pending
💾 PERSISTÊNCIA DE DADOS
Todo processamento gera logs:

Conversações: state/conversations/YYYY-MM-DD/thread_*.jsonl
Memória: state/memory/memory.json
Auditorias: state/audit/YYYY-MM-DD.jsonl
Crons: state/crons/crons.json
Digests: state/digests/YYYY-MM-DD.json
🧠 PONTOS-CHAVE DO DESIGN
✅ Dupla IA: Grok interpreta estrutura + Claude refina linguagem

✅ JSON estrito: Toda decisão é estruturada e auditável

✅ Skills modulares: Fácil adicionar novas funcionalidades

✅ Confirmação de risco: Ações destrutivas exigem confirmação

✅ Contexto conversacional: Lembra últimas mensagens e memórias

✅ Auditoria completa: Tudo é logado para troubleshooting

Esse é o fluxo completo! A arquitetura é bem pensada: mensagem → classificação → IA estrutural (Grok) → refinamento opcional (Claude) → execução de skills → resposta. Tudo auditado e persistido. 🚀