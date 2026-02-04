#!/usr/bin/env sh
set -e

REPO_URL="https://github.com/LucasBolla94/turionai.git"
INSTALL_DIR="${TURION_INSTALL_DIR:-/opt/turion}"
APP_DIR="$INSTALL_DIR/turionai"

echo "[Tur] Instalando Turion em: $APP_DIR"

ensure_cmd() {
  if command -v "$1" >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

install_packages_debian() {
  sudo apt-get update
  sudo apt-get install -y git curl ca-certificates
}

install_docker() {
  if ensure_cmd docker; then
    return 0
  fi
  echo "[Tur] Instalando Docker..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER" || true
}

install_compose_plugin() {
  if docker compose version >/dev/null 2>&1; then
    return 0
  fi
  echo "[Tur] Docker Compose plugin não encontrado."
  echo "Instale o docker compose plugin manualmente para sua distro."
  exit 1
}

if ! ensure_cmd git || ! ensure_cmd curl; then
  if [ -f /etc/debian_version ]; then
    install_packages_debian
  else
    echo "[Tur] Dependências ausentes. Instale git e curl manualmente."
    exit 1
  fi
fi

install_docker
install_compose_plugin

sudo mkdir -p "$INSTALL_DIR"
sudo chown -R "$USER":"$USER" "$INSTALL_DIR"

if [ -d "$APP_DIR/.git" ]; then
  echo "[Tur] Repositório já existe. Atualizando..."
  git -C "$APP_DIR" fetch origin main
  git -C "$APP_DIR" merge --ff-only origin/main
else
  echo "[Tur] Clonando repositório..."
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

if [ ! -f ".env" ]; then
  cat > .env <<EOF
XAI_API_KEY=
TURION_XAI_MODEL=grok-4-1-fast-reasoning
EOF
  echo "[Tur] .env criado. Edite XAI_API_KEY antes de usar a IA."
fi

echo "[Tur] Subindo container..."
docker compose up -d

echo "[Tur] Pronto. Logs:"
echo "docker compose logs -f"
