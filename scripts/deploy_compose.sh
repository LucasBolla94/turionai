#!/usr/bin/env sh
set -e

NAME="$1"
REPO="$2"
BASE_DIR="${TURION_PROJECTS_DIR:-/opt/turion/projects}"

if [ -z "$NAME" ] || [ -z "$REPO" ]; then
  echo "Uso: deploy_compose.sh <name> <repo_url>"
  exit 1
fi

TARGET_DIR="$BASE_DIR/$NAME"

mkdir -p "$BASE_DIR"

if [ -d "$TARGET_DIR/.git" ]; then
  echo "Atualizando repo em $TARGET_DIR"
  git -C "$TARGET_DIR" pull
else
  echo "Clonando $REPO em $TARGET_DIR"
  git clone "$REPO" "$TARGET_DIR"
fi

if [ -f "$TARGET_DIR/docker-compose.yml" ] || [ -f "$TARGET_DIR/compose.yml" ]; then
  echo "Subindo docker compose em $TARGET_DIR"
  docker compose -f "$TARGET_DIR/docker-compose.yml" up -d || docker compose -f "$TARGET_DIR/compose.yml" up -d
else
  echo "Arquivo docker-compose.yml não encontrado."
  exit 1
fi

echo "Deploy finalizado."
