#!/usr/bin/env sh
set -eu
REPO_PATH="$1"
BASE="/opt/turion/projects"
if [ -z "$REPO_PATH" ]; then
  echo "USAGE: git_pull.sh <repo_path>"
  exit 1
fi
case "$REPO_PATH" in
  $BASE/*) ;;
  *) echo "INVALID_PATH"; exit 1;;
esac
if [ ! -d "$REPO_PATH/.git" ]; then
  echo "NOT_A_REPO"
  exit 1
fi
git -C "$REPO_PATH" pull
