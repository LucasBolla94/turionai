# Turion

Assistente pessoal via WhatsApp com foco em seguranca, auditoria e operacao real.

- Canal: WhatsApp (Baileys)
- Cerebro: Grok (JSON estrito)
- Execucao: Docker/Compose
- Auditoria: logs e historico em JSONL

---

## Comece rapido (install.sh)

Linux (Ubuntu/Debian):

```bash
curl -fsSL https://raw.githubusercontent.com/LucasBolla94/turionai/main/scripts/install.sh | bash
```

Depois de instalar:

```bash
cd /opt/turion/turionai
nano .env
# coloque sua XAI_API_KEY

# Subir
./scripts/run_compose.sh

# Ver logs (QR code aparece aqui)
./scripts/run_logs.sh
```

Se sua maquina nao tiver `docker compose`, o instalador usa `docker-compose` legacy automaticamente.

---

## Instalacao manual (passo a passo)

```bash
git clone https://github.com/LucasBolla94/turionai.git
cd turionai
cp .env.example .env 2>/dev/null || true
```

Edite o `.env` e coloque sua `XAI_API_KEY`.

Subir com Docker:

```bash
docker compose up -d
# ou
# docker-compose up -d
```

Ver logs (QR code no primeiro login):

```bash
docker compose logs -f
# ou
# docker-compose logs -f
```

---

## Como deixar online (didatico)

1) **Instale Docker**
- Recomendado: Docker + Compose v2.
- Em VPS Ubuntu, use o `install.sh` acima.

2) **Suba o Turion**
- Ele vai mostrar um QR code no log.
- Escaneie com o WhatsApp (aparelho principal).

3) **Teste um comando**
- No WhatsApp, envie: `status`
- O Turion responde com uptime e info da maquina.

4) **Mantenha rodando**
- Docker ja reinicia automaticamente.
- Se reiniciar o servidor, ele volta sozinho.

---

## Configuracao (.env)

Exemplo:

```env
XAI_API_KEY=coloque_sua_chave
TURION_XAI_MODEL=grok-4-1-fast-reasoning
TURION_ALLOWLIST=+447432009032,255945842106407@lid
TURION_TIMEZONE=Europe/London
```

- `TURION_ALLOWLIST`: numeros autorizados.
- `TURION_TIMEZONE`: fuso horario padrao.

---

## Comandos no WhatsApp

Basicos:
- `status`
- `list scripts`
- `run <script>`
- `logs <projeto> [lines]`
- `diagnose <projeto> [lines]`
- `deploy <nome> <repo_url>`
- `redeploy <nome>`
- `cron add <name> <schedule> <jobType> [payload]`
- `cron list`
- `cron pause <name>`
- `cron remove <name>`
- `--update`

Hora e fuso:
- `time`
- `timezone Europe/London`
- Perguntas naturais: "Que horas sao?", "Atualize o horario para Londres"

---

## Memoria inteligente (automatica)

O Turion grava conversas e organiza memoria sozinho:
- Resumos diários
- Fatos e decisoes uteis
- Projetos e contexto

Organizacao automatica (cron diario):
- `memory_organizer_daily` roda todo dia as 03:30

Voce nao precisa salvar manualmente. O Grok organiza de forma economica.

---

## Atualizacao do Turion (self-update)

No WhatsApp:
- `--update`

Seguranca:
- so atualiza se o repo for o oficial
- bloqueia repositorios inesperados
- reinicia apos atualizar

---

## Logs e arquivos importantes

- Conversas: `state/conversations/YYYY-MM-DD/thread_<id>.jsonl`
- Digests: `state/digests/YYYY-MM-DD.json`
- Auditoria: `state/audit/YYYY-MM-DD.jsonl`
- Memoria: `state/memory/memory.json`
- Index: `state/memory/keyword_index.json`
- Crons: `state/crons/crons.json`

---

## Roadmap

O projeto segue o `Roadmap.md` com fases claras. Cada fase deve:
- funcionar
- ser testada
- ser segura
- ser auditavel

---

## Troubleshooting rapido

**Nao aparece QR code**
- Veja logs: `docker compose logs -f`

**Comando nao responde**
- Verifique allowlist no `.env`
- Reinicie container: `docker compose restart`

**Erro de docker**
- Verifique se o daemon esta ativo: `systemctl status docker`

---

## Licenca

Privado / em desenvolvimento.
