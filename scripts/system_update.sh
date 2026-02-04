#!/bin/sh
set -e

if ! command -v apt-get >/dev/null 2>&1; then
  echo "apt-get nao encontrado neste ambiente."
  exit 1
fi

echo "Atualizando pacotes do sistema..."
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
echo "Atualizacao do sistema concluida."
