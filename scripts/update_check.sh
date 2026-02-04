#!/usr/bin/env sh
set -eu
REPO_DIR="${1:-/app}"
cd "$REPO_DIR"
if ! command -v git >/dev/null 2>&1; then
  if command -v apk >/dev/null 2>&1; then
    apk add --no-cache git >/dev/null 2>&1 || true
  fi
fi
if ! command -v git >/dev/null 2>&1; then
  echo "GIT_NOT_FOUND"
  exit 0
fi
if [ ! -d .git ]; then
  echo "NOT_A_GIT_REPO"
  exit 0
fi
# Ensure origin exists
if ! git remote get-url origin >/dev/null 2>&1; then
  echo "NO_REMOTE"
  exit 0
fi
# Fetch updates
if ! git fetch origin --quiet; then
  echo "FETCH_FAILED"
  exit 0
fi
LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse origin/main 2>/dev/null || true)
if [ -z "$REMOTE_HASH" ]; then
  echo "NO_REMOTE_MAIN"
  exit 0
fi
if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
  echo "UP_TO_DATE"
else
  echo "UPDATE_AVAILABLE"
fi
