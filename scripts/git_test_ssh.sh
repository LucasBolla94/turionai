#!/usr/bin/env sh
set -eu
OUT=$(ssh -T -o StrictHostKeyChecking=accept-new git@github.com 2>&1 || true)
if echo "$OUT" | grep -qi "successfully authenticated"; then
  echo "OK"
else
  echo "ERROR"
  echo "$OUT"
fi
