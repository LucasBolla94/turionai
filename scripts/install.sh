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
  sudo apt-get install -y git curl ca-certificates gnupg
}

install_docker_repo_debian() {
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update
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
  if command -v docker-compose >/dev/null 2>&1; then
    return 0
  fi

  if command -v apt-get >/dev/null 2>&1; then
    # Ensure Docker repo is configured (compose plugin may not exist in default repos)
    install_docker_repo_debian || true
    echo "[Tur] Instalando docker compose plugin via apt..."
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin || true
    if docker compose version >/dev/null 2>&1; then
      return 0
    fi
    sudo apt-get install -y docker-compose-v2 || true
    if docker compose version >/dev/null 2>&1; then
      return 0
    fi
    echo "[Tur] Tentando docker-compose (legacy) via apt..."
    sudo apt-get install -y docker-compose || true
    if docker compose version >/dev/null 2>&1 || docker-compose version >/dev/null 2>&1; then
      return 0
    fi
  fi

  echo "[Tur] Instalando docker compose no usuário (sem sudo)..."
  COMPOSE_VERSION="2.30.3"
  OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
  ARCH="$(uname -m)"
  case "$ARCH" in
    x86_64|amd64) ARCH="x86_64" ;;
    aarch64|arm64) ARCH="aarch64" ;;
  esac
  DOCKER_CONFIG="${DOCKER_CONFIG:-$HOME/.docker}"
  mkdir -p "$DOCKER_CONFIG/cli-plugins"
  curl -fsSL "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-${OS}-${ARCH}" -o "$DOCKER_CONFIG/cli-plugins/docker-compose"
  chmod +x "$DOCKER_CONFIG/cli-plugins/docker-compose"

  if docker compose version >/dev/null 2>&1; then
    return 0
  fi
  if docker-compose version >/dev/null 2>&1; then
    return 0
  fi

  echo "[Tur] Docker Compose não pôde ser instalado automaticamente."
  echo "Instale manualmente para sua distro."
  exit 1
}

run_compose() {
  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_BIN="$(command -v docker-compose)"
    echo "[Tur] Usando: $COMPOSE_BIN"
    if "$COMPOSE_BIN" "$@"; then
      return
    fi
    if [ -S /var/run/docker.sock ] && [ ! -w /var/run/docker.sock ]; then
      echo "[Tur] Sem permissão no Docker socket, tentando com sudo..."
      sudo "$COMPOSE_BIN" "$@"
      return
    fi
    return
  fi
  if docker compose version >/dev/null 2>&1; then
    echo "[Tur] Usando: docker compose"
    if docker compose "$@"; then
      return
    fi
    if [ -S /var/run/docker.sock ] && [ ! -w /var/run/docker.sock ]; then
      echo "[Tur] Sem permissão no Docker socket, tentando com sudo..."
      sudo docker compose "$@"
      return
    fi
    return
  fi
  echo "[Tur] Docker Compose não disponível."
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
run_compose up -d

echo "[Tur] Pronto. Logs:"
echo "docker compose logs -f  (ou docker-compose logs -f)"
