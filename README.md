# Turion

Assistente pessoal DevOps via WhatsApp/SSH.

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
