#!/usr/bin/env bash
set -euo pipefail

APP_NAME="AgentTUR"
DEFAULT_BRANCH="main"
REPO_URL="https://github.com/LucasBolla94/agent.git"
INSTALL_DIR=""
TARGET_USER="${SUDO_USER:-$USER}"
NON_INTERACTIVE="false"
REINSTALL="false"
KEEP="false"
SAFE_DIR="${HOME}"

if ! pwd >/dev/null 2>&1; then
  cd "$SAFE_DIR"
fi

banner() {
  cat <<'EOF'
   _______          _             
  |__   __|        (_)            
     | | _   _ _ __ _  ___  _ __  
     | || | | | '__| |/ _ \| '_ \ 
     | || |_| | |  | | (_) | | | |
     |_| \__,_|_|  |_|\___/|_| |_|

     [==]----[==]----[==]
EOF
}

say() {
  echo ""
  echo ">> $1"
}

usage() {
  cat <<EOF
${APP_NAME} installer

Usage:
  ./install_tur.sh --repo <git_url> [--dir <install_dir>] [--branch <branch>] [--yes]

Example:
  ./install_tur.sh --repo https://github.com/yourorg/OpenTur.git --dir /opt/agenttur
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO_URL="$2"
      shift 2
      ;;
    --dir)
      INSTALL_DIR="$2"
      shift 2
      ;;
    --branch)
      DEFAULT_BRANCH="$2"
      shift 2
      ;;
    --yes)
      NON_INTERACTIVE="true"
      shift 1
      ;;
    --reinstall)
      REINSTALL="true"
      shift 1
      ;;
    --keep)
      KEEP="true"
      shift 1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$INSTALL_DIR" ]]; then
  if [[ "$(id -u)" -eq 0 ]]; then
    INSTALL_DIR="/opt/agenttur"
  else
    INSTALL_DIR="$HOME/agenttur"
  fi
fi

if [[ ! -t 0 ]]; then
  NON_INTERACTIVE="true"
fi
if [[ "$NON_INTERACTIVE" == "true" ]]; then
  REINSTALL="true"
  KEEP="false"
fi

if [[ -z "$REPO_URL" ]]; then
  echo "Missing --repo <git_url>"
  usage
  exit 1
fi

require_cmd() {
  command -v "$1" >/dev/null 2>&1
}

install_deps_debian() {
  sudo apt-get update -y
  sudo apt-get install -y curl ca-certificates git build-essential python3 nginx

  if ! require_cmd node; then
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi

  if ! require_cmd docker; then
    if sudo apt-get install -y docker.io docker-compose-plugin; then
      true
    else
      say "docker-compose-plugin unavailable. Installing classic docker-compose."
      sudo apt-get install -y docker.io docker-compose
    fi
    sudo systemctl enable --now docker
  fi
}

install_deps_rhel() {
  sudo yum install -y curl ca-certificates git gcc-c++ make python3 nginx

  if ! require_cmd node; then
    curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
    sudo yum install -y nodejs
  fi

  if ! require_cmd docker; then
    sudo yum install -y docker docker-compose-plugin
    sudo systemctl enable --now docker
  fi
}

install_deps_arch() {
  sudo pacman -Syu --noconfirm
  sudo pacman -S --noconfirm curl ca-certificates git base-devel python nginx nodejs npm docker docker-compose
  sudo systemctl enable --now docker
}

detect_and_install() {
  if [[ -f /etc/debian_version ]]; then
    install_deps_debian
    return
  fi
  if [[ -f /etc/redhat-release ]]; then
    install_deps_rhel
    return
  fi
  if [[ -f /etc/arch-release ]]; then
    install_deps_arch
    return
  fi
  echo "Unsupported distro. Please install dependencies manually."
  exit 1
}

banner
say "Oi! Vou cuidar da instalacao do ${APP_NAME} pra voce."
say "Isso pode demorar alguns minutos. Vamos juntos."

detect_and_install

if [[ -d "$INSTALL_DIR" ]]; then
  say "Pasta encontrada: $INSTALL_DIR"
  if [[ "$(pwd -P)" == "$INSTALL_DIR"* ]]; then
    cd "$SAFE_DIR"
  fi
  if [[ "$REINSTALL" == "true" ]]; then
    choice="1"
  elif [[ "$KEEP" == "true" ]]; then
    choice="2"
  elif [[ "$NON_INTERACTIVE" == "true" ]]; then
    choice="1"
  else
    echo "Esse arquivo ja esta instalado. Voce gostaria de:"
    echo "  1) Deletar e reinstalar"
    echo "  2) Manter tudo (apenas atualizar)"
    read -r -p "> " choice
  fi

  if [[ "$choice" == "1" ]]; then
    say "Removendo instalacao antiga..."
    sudo rm -rf "$INSTALL_DIR"
    sudo mkdir -p "$INSTALL_DIR"
    sudo chown "$TARGET_USER":"$TARGET_USER" "$INSTALL_DIR"
    say "Baixando o repositorio..."
    git clone --branch "$DEFAULT_BRANCH" "$REPO_URL" "$INSTALL_DIR"
  else
    say "Mantendo arquivos e atualizando..."
    if [[ -d "$INSTALL_DIR/.git" ]]; then
      git -C "$INSTALL_DIR" pull
    else
      say "Repositorio ausente. Fazendo clone limpo..."
      git clone --branch "$DEFAULT_BRANCH" "$REPO_URL" "$INSTALL_DIR"
    fi
  fi
else
  say "Criando pasta: $INSTALL_DIR"
  if [[ "$(id -u)" -eq 0 ]]; then
    mkdir -p "$INSTALL_DIR"
  else
    sudo mkdir -p "$INSTALL_DIR"
    sudo chown "$TARGET_USER":"$TARGET_USER" "$INSTALL_DIR"
  fi
  say "Baixando o repositorio..."
  git clone --branch "$DEFAULT_BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
if [[ "$(id -u)" -eq 0 ]]; then
  chown -R "$TARGET_USER":"$TARGET_USER" "$INSTALL_DIR"
else
  sudo chown -R "$TARGET_USER":"$TARGET_USER" "$INSTALL_DIR"
fi

npm config set fund false
npm config set audit false
npm install
npm run build
npm prune --omit=dev

NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" ]]; then
  echo "Node.js not found after install."
  exit 1
fi

sudo tee /usr/local/bin/turion >/dev/null <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$INSTALL_DIR"
exec "$NODE_BIN" "$INSTALL_DIR/dist/cli/turion.js" "\$@"
EOF
sudo chmod +x /usr/local/bin/turion

SERVICE_PATH="/etc/systemd/system/agenttur.service"
sudo tee "$SERVICE_PATH" >/dev/null <<EOF
[Unit]
Description=AgentTUR service
After=network.target

[Service]
Type=simple
User=$TARGET_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$NODE_BIN $INSTALL_DIR/dist/index.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable agenttur >/dev/null 2>&1 || true

say "Instalacao concluida!"
if [[ -e /dev/tty ]]; then
  say "Iniciando setup agora..."
  /usr/local/bin/turion setup </dev/tty
else
  say "Agora execute: turion setup"
fi
say "Se precisar entrar na pasta: cd $INSTALL_DIR"
