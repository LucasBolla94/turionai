#!/usr/bin/env bash
set -euo pipefail

APP_NAME="AgentTUR"
DEFAULT_BRANCH="main"
REPO_URL="https://github.com/LucasBolla94/agent.git"
INSTALL_DIR="/opt/agenttur"

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
  ./install_tur.sh --repo <git_url> [--dir <install_dir>] [--branch <branch>]

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
      say "docker-compose-plugin indisponível. Instalando docker-compose clássico."
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
say "Oi! Vou cuidar da instalação do ${APP_NAME} pra você."
say "Posso demorar alguns minutos. Vamos juntos!"

detect_and_install

if [[ -d "$INSTALL_DIR" ]]; then
  say "Pasta encontrada: $INSTALL_DIR"
  echo "Esse arquivo já está instalado. Você gostaria de:"
  echo "  1) Deletar e reinstalar"
  echo "  2) Manter tudo (apenas atualizar)"
  read -r -p "> " choice
  if [[ "$choice" == "1" ]]; then
    say "Removendo instalação antiga..."
    sudo rm -rf "$INSTALL_DIR"
    sudo mkdir -p "$INSTALL_DIR"
    sudo chown "$USER":"$USER" "$INSTALL_DIR"
    say "Baixando o repositório..."
    git clone --branch "$DEFAULT_BRANCH" "$REPO_URL" "$INSTALL_DIR"
  else
    say "Mantendo arquivos e atualizando..."
    if [[ -d "$INSTALL_DIR/.git" ]]; then
      git -C "$INSTALL_DIR" pull
    else
      say "Repositório ausente. Fazendo clone limpo..."
      git clone --branch "$DEFAULT_BRANCH" "$REPO_URL" "$INSTALL_DIR"
    fi
  fi
else
  say "Criando pasta: $INSTALL_DIR"
  sudo mkdir -p "$INSTALL_DIR"
  sudo chown "$USER":"$USER" "$INSTALL_DIR"
  say "Baixando o repositório..."
  git clone --branch "$DEFAULT_BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
npm config set fund false
npm config set audit false
npm install
npm run build
npm prune --omit=dev

sudo npm install -g .

say "Instalação concluída!"
say "Agora execute: turion setup"
