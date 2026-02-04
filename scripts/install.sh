#!/usr/bin/env sh
set -e

REPO_URL="https://github.com/LucasBolla94/turionai.git"
INSTALL_DIR="${TURION_INSTALL_DIR:-/opt/turion}"
APP_DIR="$INSTALL_DIR/turionai"

step() {
  STEP_NUM=$((STEP_NUM + 1))
  echo ""
  echo "[Tur] Etapa ${STEP_NUM}: $1"
  echo "----------------------------------------"
}

STEP_NUM=0

step "Preparando instalacao em: $APP_DIR"

ensure_cmd() {
  if command -v "$1" >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

install_packages_debian() {
  sudo apt-get update -y >/dev/null 2>&1
  sudo apt-get install -y git curl ca-certificates gnupg >/dev/null 2>&1
}

install_docker_repo_debian() {
  sudo install -m 0755 -d /etc/apt/keyrings >/dev/null 2>&1
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg >/dev/null 2>&1
  sudo chmod a+r /etc/apt/keyrings/docker.gpg >/dev/null 2>&1
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y >/dev/null 2>&1
}

install_docker() {
  if ensure_cmd docker; then
    return 0
  fi
  echo "[Tur] Instalando Docker (pode demorar alguns minutos)..."
  curl -fsSL https://get.docker.com | sudo sh >/dev/null 2>&1
  sudo usermod -aG docker "$USER" || true
}

start_docker_service() {
  if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl enable --now docker >/dev/null 2>&1 || true
    if systemctl is-active --quiet docker; then
      return 0
    fi
  fi
  if command -v service >/dev/null 2>&1; then
    sudo service docker start >/dev/null 2>&1 || true
  fi
}

install_compose_plugin() {
  if docker compose version >/dev/null 2>&1; then
    return 0
  fi

  if command -v apt-get >/dev/null 2>&1; then
    echo "[Tur] Tentando docker-compose-v2 (pacote Ubuntu)..."
    sudo apt-get update -y >/dev/null 2>&1
    sudo apt-get install -y docker-compose-v2 >/dev/null 2>&1 || true
    if docker compose version >/dev/null 2>&1; then
      return 0
    fi
    install_docker_repo_debian || true
    echo "[Tur] Instalando docker compose plugin via apt..."
    sudo apt-get update -y >/dev/null 2>&1
    sudo apt-get install -y docker-compose-plugin >/dev/null 2>&1 || true
    if docker compose version >/dev/null 2>&1; then
      return 0
    fi
    sudo apt-get install -y docker-compose-v2 >/dev/null 2>&1 || true
    if docker compose version >/dev/null 2>&1; then
      return 0
    fi
    echo "[Tur] Tentando docker-compose (legacy) via apt..."
    sudo apt-get install -y docker-compose >/dev/null 2>&1 || true
    if docker compose version >/dev/null 2>&1 || docker-compose version >/dev/null 2>&1; then
      return 0
    fi
  fi

  echo "[Tur] Instalando docker compose no usuario (sem sudo)..."
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

  echo "[Tur] Docker Compose nao pode ser instalado automaticamente."
  echo "Instale manualmente para sua distro."
  exit 1
}

run_compose() {
  if docker compose version >/dev/null 2>&1; then
    echo "[Tur] Usando: docker compose"
    if docker compose "$@"; then
      return
    fi
    if [ -S /var/run/docker.sock ] && [ ! -w /var/run/docker.sock ]; then
      echo "[Tur] Sem permissao no Docker socket, tentando com sudo..."
      sudo docker compose "$@"
      return
    fi
    return
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_BIN="$(command -v docker-compose)"
    echo "[Tur] Usando: $COMPOSE_BIN (legacy)"
    if "$COMPOSE_BIN" "$@"; then
      return
    fi
    if [ -S /var/run/docker.sock ] && [ ! -w /var/run/docker.sock ]; then
      echo "[Tur] Sem permissao no Docker socket, tentando com sudo..."
      sudo "$COMPOSE_BIN" "$@"
      return
    fi
    return
  fi
  echo "[Tur] Docker Compose nao disponivel."
  exit 1
}

step "Checando dependencias basicas (git/curl)"
if ! ensure_cmd git || ! ensure_cmd curl; then
  if [ -f /etc/debian_version ]; then
    install_packages_debian
  else
    echo "[Tur] Dependencias ausentes. Instale git e curl manualmente."
    exit 1
  fi
fi

step "Checando Docker"
install_docker
step "Checando Docker Compose"
install_compose_plugin
step "Iniciando servico Docker"
start_docker_service

step "Preparando diretorio de instalacao"
sudo mkdir -p "$INSTALL_DIR"
sudo chown -R "$USER":"$USER" "$INSTALL_DIR"

if [ -d "$APP_DIR/.git" ]; then
  step "Repositorio ja existe. Atualizando"
  git -C "$APP_DIR" fetch -q origin main
  git -C "$APP_DIR" merge --ff-only -q origin/main
else
  step "Clonando repositorio"
  git clone --quiet "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

if [ ! -f ".env" ]; then
  step "Criando .env inicial"
  cat > .env <<EOF
XAI_API_KEY=
TURION_XAI_MODEL=grok-4-1-fast-reasoning
EOF
  echo "[Tur] .env criado. Edite XAI_API_KEY antes de usar a IA."
fi

step "Subindo container"
run_compose down >/dev/null 2>&1 || true
rm -rf "$APP_DIR/state/baileys" >/dev/null 2>&1 || true
if ! run_compose up -d --force-recreate >/dev/null 2>&1; then
  echo "[Tur] Falha ao subir container. Reexecutando com logs..."
  run_compose up -d --force-recreate
fi

step "Pronto. Abrindo logs para QR Code (Ctrl+C para sair)"
if command -v awk >/dev/null 2>&1; then
  run_compose logs -f | awk '
    BEGIN { show=0 }
    /\[Tur\] Codigo de pareamento:/ { print; next }
    /\[Tur\] Novo QR Code gerado/ { show=1; print; next }
    /\[Tur\] Escaneie o QR Code acima/ { print; show=0; next }
    /\[Turion\] WhatsApp conectado/ { print; next }
    /\[Turion\] WhatsApp desconectado/ { print; next }
    show==1 { print }
  '
else
  run_compose logs -f
fi
