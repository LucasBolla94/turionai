# Roadmap v1.2 — Projeto Turion (Human UX + Web Research + Skill Builder)

Repo base (já implementado): `LucasBolla94/turionai` :contentReference[oaicite:0]{index=0}  
Este v1.2 **não substitui** as fases 0–15 (já concluídas). Ele **evolui por cima** do que você já tem: WhatsApp (Baileys), allowlist, pipeline, executor via scripts whitelist, CRON, Brain Grok JSON estrito, registry de projetos, logs/diagnose, skills + plan runner, audit JSONL e memória/digest com organizer diário. :contentReference[oaicite:1]{index=1}

---

## Objetivo do v1.2 (em 10 steps)
1) Deixar a interação **mais humana e consistente** (sem virar “palhaço”, sem gastar tokens à toa)  
2) Criar uma camada “**Prompt Intelligence**” mais forte (entender prompts vagos/ambíguos e sequências)  
3) Habilitar **pesquisa via web** (coleta → leitura → filtragem → resposta) com segurança e auditoria  
4) Criar um **Skill Builder**: o agente consegue **criar novos scripts/skills** quando você pedir, usando o **modelo certo** para código  
5) Melhorar o “multi-model router”:  
   - **grok-code-fast-1** → gerar/alterar arquivos/scripts/skills  
   - **grok-3** → ler/entender resultados de pesquisa e produzir resposta melhor (resumo + ação)  
   - (seu modelo padrão atual) → intenção/planejamento JSON estrito (mantém o cérebro principal)

> Princípio mantido: **IA interpreta → Turion decide → Skill executa → Executor limitado → AuditLog registra**.

---

# STEP 1 — Human UX Engine (fala humana consistente + previsível)

### Objetivo
Padronizar o jeito de falar do Turion (amigável, profissional, útil), mas **sem custar tokens** e sem afetar decisões técnicas.

### Entregáveis
- `state/persona/behavior_profile.json`
- `state/persona/emotion_state.json`
- `state/persona/user_style.json`
- `src/core/ux/HumanReply.ts` (camada local de “polimento” de resposta)

### Regras
- **Nada disso muda execução**, só muda **texto final**.
- Ajuste por feedback direto (“sem emoji”, “responde curto”, “mais formal”) **sem perguntar**.

### Testes
- Você pede: “responde curto” → próximas respostas diminuem
- Você pede: “sem emoji” → emoji_level vira 0
- Conversa normal continua natural

---

# STEP 2 — Prompt Intelligence v2 (entender “isso”, “aquele deploy”, “igual da outra vez”)

### Objetivo
Antes de chamar o Brain, resolver localmente:
- referência (“isso”, “aquilo”, “ele”)
- continuação de contexto (“faz isso amanhã”)
- sequências (“redeploy e depois pega logs”)

### Entregáveis
- `src/core/prompt/ContextResolver.ts`
- `src/core/prompt/IntentRefiner.ts`
- `src/core/prompt/PromptRouter.ts`

### Estratégia (barata)
- usar: últimas 3–5 mensagens + digest + memória por keyword (você já tem)
- detectar “comando técnico” vs “conversa” vs “pesquisa” vs “criar skill”

### Testes
- “faz igual da outra vez” (após um deploy) → ele entende projeto/stack pelo registry
- “vê esse erro” → ele busca logs/diagnose sem você repetir tudo

---

# STEP 3 — “Presence Defaults” (check-ins 3x/dia, 09:00–20:00, não invasivo)

### Objetivo
Ativar presença humana (3 mensagens por dia) com variação de frases e anti-spam.

### Entregáveis
- Cron fixo: `interaction_checkin_default`
- `state/crons/interaction_phrases.json`
- `src/skills/InteractionSkill.ts` (gera mensagem + regras)

### Regras importantes
- 3 execuções/dia, horários **randômicos** entre **09:00–20:00**
- **Não repetir frase no mesmo dia**
- Auto-pausa se:
  - você pedir (“para de mandar isso”)
  - você ficar X dias sem responder (configurável)
- Sempre usar `{name}` se existir na memória (senão, neutro)

### Testes
- Em 1 dia: recebe 3 check-ins em horários diferentes
- Pede “pausa checkin” → cron pausa e fica auditado

---

# STEP 4 — Web Research Mode (pesquisa na web com segurança + logs)

### Objetivo
O Turion poder:
- pesquisar um tema
- abrir 3–8 fontes
- extrair pontos-chave
- responder com clareza
- tudo auditável e com limites (token saver)

### Entregáveis
- `src/skills/WebResearchSkill.ts`
- `src/core/web/WebClient.ts` (fetch com allowlist + timeouts)
- `state/web/cache/` (cache curto)
- `state/web/sources/YYYY-MM-DD/thread_<id>.jsonl` (trechos e metadados)

### Política de segurança (recomendada)
- Allowlist por domínio (ex: docs oficiais, sites conhecidos)
- Bloquear downloads perigosos por padrão
- Rate limit (evita loop)
- Salvar sempre:
  - query
  - urls consultadas
  - snippets usados
  - resumo final

### Modelo
- **grok-3**: para **ler e resumir** os resultados (melhor compreensão de texto)
- Brain principal continua fazendo intenção/ação

### Testes
- “pesquisa X e me traz um resumo” → resposta com fontes e conclusão
- “abre a doc oficial e me diz o passo” → ele extrai do site e te dá o passo-a-passo

---

# STEP 5 — Multi-Model Router (o modelo certo para cada trabalho)

### Objetivo
Centralizar decisões de “qual modelo usar”:
- intenção/JSON estrito (brain)
- pesquisa (grok-3)
- código/arquivos/scripts (grok-code-fast-1)

### Entregáveis
- `src/brain/ModelRouter.ts`
- `.env`:
  - `TURION_MODEL_BRAIN=...`
  - `TURION_MODEL_RESEARCH=grok-3`
  - `TURION_MODEL_CODE=grok-code-fast-1`

### Regras
- “mexer em código / criar arquivos / criar script / editar skill” → **sempre** MODEL_CODE
- “pesquisar na internet / comparar fontes / ler doc” → **sempre** MODEL_RESEARCH
- “classificar intenção / decidir plano JSON” → MODEL_BRAIN

### Testes
- “cria um script novo pra X” → log mostra MODEL_CODE
- “pesquisa preço/guia/como fazer” → log mostra MODEL_RESEARCH

---

# STEP 6 — Skill Builder v1 (o agente cria novas ações sozinho, com segurança)

### Objetivo
Quando você pedir algo novo (“cria uma ação pra…”), o Turion:
1) entende a intenção
2) **gera um plano**
3) cria/edita arquivos necessários (script + skill + registro)
4) roda testes controlados
5) adiciona na whitelist
6) documenta e audita

### Entregáveis
- `src/skills/SkillBuilderSkill.ts`
- `src/core/builder/Scaffold.ts`
- `src/core/builder/ReviewGate.ts` (validações)
- `state/builder/history.jsonl`

### Regras críticas
- Novos scripts **nascem desativados** até passar validações
- Builder só pode escrever em:
  - `scripts/`
  - `src/skills/`
  - `docs/`
- “run” só depois de:
  - lint/format
  - dry-run
  - checksum + whitelist update

### Modelo
- **grok-code-fast-1** para gerar os arquivos

### Testes
- “cria um comando pra listar uso de disco” → ele cria `scripts/disk_usage.sh` + `DiskUsageSkill.ts`

---

# STEP 7 — Script Whitelist v2 (permissões granulares e seguras)

### Objetivo
Evoluir whitelist para:
- tags de risco
- limites
- argumentos permitidos
- timeout por script
- “no destructive ops” por padrão

### Entregáveis
- `state/security/script_policy.json`
Exemplo:
```json
{
  "scripts": {
    "disk_usage.sh": { "risk": "low", "timeout_ms": 8000, "args": [] },
    "deploy_compose.sh": { "risk": "medium", "timeout_ms": 300000, "args": ["project"] }
  }
}
