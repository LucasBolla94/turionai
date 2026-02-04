#!/usr/bin/env sh
set -eu
REPO_URL="$1"
TARGET_PATH="$2"
BASE="/opt/turion/projects"
if [ -z "$REPO_URL" ] || [ -z "$TARGET_PATH" ]; then
  echo "USAGE: git_clone.sh <repo_ssh_url> <target_path>"
  exit 1
fi
case "$REPO_URL" in
  git@github.com:*) ;; 
  *) echo "INVALID_REPO"; exit 1;;
esac
case "$TARGET_PATH" in
  $BASE/*) ;;
  *) echo "INVALID_PATH"; exit 1;;
esac
mkdir -p "$BASE"
if [ -d "$TARGET_PATH/.git" ]; then
  echo "ALREADY_EXISTS"
  exit 0
fi
git clone "$REPO_URL" "$TARGET_PATH"
