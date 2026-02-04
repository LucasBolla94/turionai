# Turion

Assistente pessoal DevOps via WhatsApp/SSH.

## Instalação rápida (install.sh)

Linux (Ubuntu/Debian):

```bash
curl -fsSL https://raw.githubusercontent.com/LucasBolla94/turionai/main/scripts/install.sh | bash
```

Após instalar:

```bash
cd /opt/turion/turionai
docker compose logs -f
```

Se sua distro usa `docker-compose` legacy:

```bash
cd /opt/turion/turionai
docker-compose logs -f
```

## Instalação manual (clone + docker)

```bash
git clone https://github.com/LucasBolla94/turionai.git
cd turionai
cp .env.example .env 2>/dev/null || true
```

Edite o `.env` e coloque sua `XAI_API_KEY`.

Subir com Docker Compose:

```bash
docker compose up -d
```

Ou com legacy:

```bash
docker-compose up -d
```

## Fase 1 (estrutura base)

- Subir o processo
- Logar inicio
- Ficar rodando

## Como rodar (Windows/macOS/Linux)

```bash
npm install
npm run dev
```

Ou com Docker:

```bash
docker compose up -d
```

Notas Windows:
- Use PowerShell ou CMD com Node.js instalado.
- Docker requer Docker Desktop.

## Fase 2 (WhatsApp - Baileys)

- Ao rodar, o QR Code aparece no terminal/log.
- Depois do primeiro login, a sessão fica salva em `state/baileys`.

Para ver logs do container:

```bash
docker compose logs -f
```

## Fase 3 (Allowlist)

Por padrão, apenas números na allowlist podem interagir.

Número padrão:
- +447432009032

Para sobrescrever, use variável de ambiente:

```bash
TURION_ALLOWLIST="+447432009032,+5511999999999" npm run dev
```

Se seu WhatsApp aparecer como `@lid` nos logs, adicione também o LID:

```bash
TURION_ALLOWLIST="447432009032,255945842106407@lid" npm run dev
```

## Fase 4 (Message Pipeline)

O Turion classifica mensagens em:

- COMMAND (ex: "status", "deploy", "cron", "/help")
- CHAT (ex: "oi", "bom dia")
- UNKNOWN (qualquer outra)

## Fase 5 (Executor seguro)

O executor roda apenas scripts dentro da pasta `scripts/`.

Scripts padrão:
- `ping.sh`
- `whoami.sh`

Para definir outra pasta:

```bash
TURION_SCRIPTS_DIR="C:\\caminho\\para\\scripts" npm run dev
```

## Fase 6 (Comandos reais)

Comandos disponíveis no WhatsApp:
- `status`
- `list scripts`
- `run <script>`

## Fase 7 (Cron Jobs + Token Saver base)

Comandos:
- `cron add <name> <schedule> <jobType> [payload]`
- `cron list`
- `cron pause <name>`
- `cron remove <name>`

Exemplo:

```bash
cron add backup_minutely "*/1 * * * *" log "backup_test"
```

Estrutura criada em `state/`:
- `state/crons/crons.json`
- `state/conversations/`
- `state/digests/`
- `state/memory/`
- `state/cache/`

## Fase 8 (Brain com Grok - JSON estrito)

Configurar a chave via variável de ambiente (não comite a chave):

```bash
XAI_API_KEY="SUA_CHAVE" TURION_XAI_MODEL="grok-4" npm run dev
```

O Turion responde com JSON interpretado:
- Intent
- Args
- Missing
- Needs confirmation

## Fase 9 (Deploy simples + Project Registry)

Comandos:
- `deploy <name> <repo_url>`
- `redeploy <name>`

Registry:
- `state/memory/projects.json`

## Fase 10 (Logs + Diagnose com Grok)

Comandos:
- `logs <name> [lines]`
- `diagnose <name> [lines]`

Limites:
- logs truncados em ~20KB
- dedupe de linhas repetidas

## Fase 11 (Skills + Plan Runner)

Skills registradas:
- `StatusSkill`
- `ScriptSkill`
- `DeploySkill`
- `LogsSkill`
- `CronSkill`

Plan Runner:
- executa passos em sequência
- registra em `state/audit/YYYY-MM-DD.jsonl`

## Fase 12 (Audit + Conversation Digest)

- Conversas gravadas em `state/conversations/YYYY-MM-DD/thread_<id>.jsonl`
- Digest automático a cada 10 mensagens em `state/digests/YYYY-MM-DD.json`
- Audit de planos em `state/audit/YYYY-MM-DD.jsonl`

## Atualização do Turion (self-update)

Comando:
- `--update`

Regras de segurança:
- somente se o remote for `git@github.com:LucasBolla94/turionai.git`
- aborta se houver alterações locais
- reinicia o processo após atualizar

Ações permitidas (executadas com segurança):
- `create_dir` (somente dentro do workspace)
- `write_file` (somente dentro do workspace)
- `run_script` (somente scripts na pasta `scripts/`)
