#!/usr/bin/env sh
set -eu
KEY_NAME="turion_github_ed25519"
SSH_DIR="$HOME/.ssh"
KEY_PATH="$SSH_DIR/$KEY_NAME"
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"
if [ ! -f "$KEY_PATH" ]; then
  ssh-keygen -t ed25519 -f "$KEY_PATH" -N "" >/dev/null
fi
if [ ! -f "$KEY_PATH.pub" ]; then
  echo "PUBLIC_KEY_MISSING"
  exit 0
fi
if ! grep -q "Host github.com" "$SSH_DIR/config" 2>/dev/null; then
  {
    echo "Host github.com"
    echo "  IdentityFile $KEY_PATH"
    echo "  IdentitiesOnly yes"
  } >> "$SSH_DIR/config"
fi
ssh-keyscan -t ed25519 github.com >> "$SSH_DIR/known_hosts" 2>/dev/null || true
FINGERPRINT=$(ssh-keygen -lf "$KEY_PATH.pub" | awk '{print $2}')
PUB_KEY=$(cat "$KEY_PATH.pub")
echo "PUBLIC_KEY: $PUB_KEY"
echo "FINGERPRINT: $FINGERPRINT"
