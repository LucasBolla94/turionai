#!/usr/bin/env sh
set -eu
REPO_DIR="${1:-/app}"
cd "$REPO_DIR"
if ! command -v git >/dev/null 2>&1; then
  echo "GIT_NOT_FOUND"
  exit 0
fi
if [ ! -d .git ]; then
  echo "NOT_A_GIT_REPO"
  exit 0
fi
REMOTE_URL=$(git remote get-url origin 2>/dev/null || true)
if [ -z "$REMOTE_URL" ]; then
  echo "NO_REMOTE"
  exit 0
fi
echo "CONNECTED $REMOTE_URL"
