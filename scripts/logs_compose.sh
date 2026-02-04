#!/usr/bin/env sh
set -e

NAME="$1"
LINES="$2"
BASE_DIR="${TURION_PROJECTS_DIR:-/opt/turion/projects}"

if [ -z "$NAME" ]; then
  echo "Uso: logs_compose.sh <name> [lines]"
  exit 1
fi

TARGET_DIR="$BASE_DIR/$NAME"
LINES="${LINES:-200}"

if [ -f "$TARGET_DIR/docker-compose.yml" ]; then
  docker compose -f "$TARGET_DIR/docker-compose.yml" logs --tail "$LINES"
  exit 0
fi

if [ -f "$TARGET_DIR/compose.yml" ]; then
  docker compose -f "$TARGET_DIR/compose.yml" logs --tail "$LINES"
  exit 0
fi

echo "Arquivo docker-compose.yml não encontrado."
exit 1
