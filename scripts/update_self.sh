#!/usr/bin/env sh
set -e
set -x

REPO_DIR="${TURION_REPO_DIR:-/app}"
EXPECTED_URL_1="https://github.com/LucasBolla94/turionai"
EXPECTED_URL_2="https://github.com/LucasBolla94/turionai.git"
ENV_BACKUP="/tmp/turion_env_backup"

if ! command -v git >/dev/null 2>&1; then
  if command -v apk >/dev/null 2>&1; then
    apk add --no-cache git
  else
    echo "git não encontrado."
    exit 1
  fi
fi

cd "$REPO_DIR"
if [ ! -d ".git" ]; then
  echo "Repositorio nao encontrado em $REPO_DIR (.git ausente)."
  exit 1
fi

if [ -f ".env" ]; then
  cp ".env" "$ENV_BACKUP"
  echo "Backup do .env salvo em $ENV_BACKUP"
fi

git config --global --add safe.directory "$REPO_DIR" || true

REMOTE_URL="$(git config --get remote.origin.url || true)"
echo "Remote: $REMOTE_URL"
if [ -z "$REMOTE_URL" ]; then
  echo "Remote vazio. Configurando origin..."
  git remote add origin "$EXPECTED_URL_2" || true
  REMOTE_URL="$(git config --get remote.origin.url || true)"
  echo "Remote: $REMOTE_URL"
fi
if [ "$REMOTE_URL" != "$EXPECTED_URL_1" ] && [ "$REMOTE_URL" != "$EXPECTED_URL_2" ] && [ "$REMOTE_URL" != "$EXPECTED_URL_3" ]; then
  echo "Remote inesperado: $REMOTE_URL"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Repositorio com alterações locais. Abortando update."
  exit 1
fi

git fetch origin main
git merge --ff-only origin/main

npm install

if [ -f "$ENV_BACKUP" ]; then
  cp "$ENV_BACKUP" ".env"
  echo ".env restaurado do backup (preservado)."
fi

echo "Atualizacao aplicada."
