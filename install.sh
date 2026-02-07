#!/bin/bash
set -euo pipefail  # Exit on error, undefined vars, pipe fails

# ============================================================================
#   ████████╗██╗   ██╗██████╗ ██╗ ██████╗ ███╗   ██╗
#   ╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗████╗  ██║
#      ██║   ██║   ██║██████╔╝██║██║   ██║██╔██╗ ██║
#      ██║   ██║   ██║██╔══██╗██║██║   ██║██║╚██╗██║
#      ██║   ╚██████╔╝██║  ██║██║╚██████╔╝██║ ╚████║
#      ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝
#
#   Instalador Profissional - V1.1.1
#   Linux / macOS
#
# ============================================================================

# ===== CONFIGURAÇÕES =====
TURION_DIR="/opt/turion"
TURION_REPO="https://github.com/LucasBolla94/turionai.git"
TURION_UID=1001
TURION_GID=1001
MIN_DISK_MB=2048

# ===== CORES E FORMATAÇÃO =====
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
DIM='\033[0;2m'
NC='\033[0m'

# ===== FUNÇÕES DE PRINT =====

print_header() {
    clear
    echo -e "${CYAN}"
    cat << "EOF"
    ████████╗██╗   ██╗██████╗ ██╗ ██████╗ ███╗   ██╗
    ╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗████╗  ██║
       ██║   ██║   ██║██████╔╝██║██║   ██║██╔██╗ ██║
       ██║   ██║   ██║██╔══██╗██║██║   ██║██║╚██╗██║
       ██║   ╚██████╔╝██║  ██║██║╚██████╔╝██║ ╚████║
       ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝
EOF
    echo -e "${NC}"
    echo -e "${WHITE}        🤖 Assistente Pessoal via WhatsApp${NC}"
    echo -e "${DIM}           Versão 1.1.1 - Instalação Profissional${NC}"
    echo ""
}

print_step() {
    echo ""
    echo -e "${BOLD}${CYAN}▶${NC} ${WHITE}$1${NC}"
}

print_substep() {
    echo -e "  ${DIM}└─${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_box() {
    local text="$1"
    local color="${2:-$GREEN}"
    local width=60

    echo ""
    echo -e "${color}╔$(printf '═%.0s' {1..60})╗${NC}"
    printf "${color}║${NC}%*s${color}║${NC}\n" $(((${#text}+$width)/2)) "$text"
    echo -e "${color}╚$(printf '═%.0s' {1..60})╝${NC}"
    echo ""
}

show_progress() {
    local current=$1
    local total=$2
    local width=50
    local percentage=$((current * 100 / total))
    local completed=$((width * current / total))

    printf "\r  ["
    printf "%${completed}s" | tr ' ' '█'
    printf "%$((width - completed))s" | tr ' ' '░'
    printf "] ${percentage}%%"
}

# ===== VALIDAÇÕES INICIAIS =====

check_root_or_sudo() {
    print_step "Verificando privilégios..."

    if [ "$EUID" -eq 0 ]; then
        SUDO=""
        print_substep "Executando como root"
    else
        if ! command -v sudo &> /dev/null; then
            print_error "sudo não está instalado"
            exit 1
        fi
        SUDO="sudo"
        print_substep "Usando sudo"
    fi

    print_success "Privilégios OK"
}

check_disk_space() {
    print_step "Verificando espaço em disco..."

    local available_mb=$(df / | tail -1 | awk '{print int($4/1024)}')

    if [ "$available_mb" -lt "$MIN_DISK_MB" ]; then
        print_error "Espaço insuficiente: ${available_mb}MB disponível, ${MIN_DISK_MB}MB necessário"
        exit 1
    fi

    print_substep "${available_mb}MB disponível"
    print_success "Espaço em disco OK"
}

check_connectivity() {
    print_step "Verificando conectividade..."

    if ! curl -fsSL --connect-timeout 5 https://github.com > /dev/null 2>&1; then
        print_error "Sem conectividade com GitHub"
        exit 1
    fi

    print_success "Conectividade OK"
}

# ===== ATUALIZAÇÃO DO SISTEMA =====

update_system() {
    print_step "Atualizando sistema (update & upgrade)..."

    if command -v apt-get &> /dev/null; then
        print_substep "Detectado: Debian/Ubuntu"
        print_substep "Executando apt-get update..."
        $SUDO apt-get update -qq > /dev/null 2>&1
        print_substep "Executando apt-get upgrade (pode demorar alguns minutos)..."
        $SUDO DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq \
            -o Dpkg::Options::="--force-confdef" \
            -o Dpkg::Options::="--force-confold" > /dev/null 2>&1
        print_success "Sistema atualizado"

    elif command -v yum &> /dev/null; then
        print_substep "Detectado: CentOS/RHEL"
        $SUDO yum update -y -q > /dev/null 2>&1
        print_success "Sistema atualizado"

    else
        print_warning "Gerenciador de pacotes não reconhecido, pulando update"
    fi
}

# ===== INSTALAÇÃO DE DEPENDÊNCIAS =====

install_dependencies() {
    print_step "Instalando dependências..."

    local deps_to_install=()

    if ! command -v git &> /dev/null; then
        deps_to_install+=("git")
    fi

    if ! command -v curl &> /dev/null; then
        deps_to_install+=("curl")
    fi

    if [ ${#deps_to_install[@]} -gt 0 ]; then
        if command -v apt-get &> /dev/null; then
            print_substep "Instalando: ${deps_to_install[*]}"
            $SUDO apt-get install -y -qq "${deps_to_install[@]}" ca-certificates > /dev/null 2>&1
        elif command -v yum &> /dev/null; then
            $SUDO yum install -y -q "${deps_to_install[@]}" ca-certificates > /dev/null 2>&1
        fi
        print_success "Dependências instaladas"
    else
        print_success "Dependências já instaladas"
    fi
}

# ===== INSTALAÇÃO DOCKER =====

install_docker() {
    print_step "Verificando Docker..."

    if command -v docker &> /dev/null && docker --version > /dev/null 2>&1; then
        print_success "Docker já instalado ($(docker --version | cut -d' ' -f3 | tr -d ','))"
        return 0
    fi

    print_substep "Docker não encontrado, instalando..."

    if ! curl -fsSL https://get.docker.com -o /tmp/get-docker.sh 2>&1; then
        print_error "Falha ao baixar instalador Docker"
        exit 1
    fi

    if ! $SUDO sh /tmp/get-docker.sh > /dev/null 2>&1; then
        print_error "Falha ao instalar Docker"
        exit 1
    fi

    $SUDO usermod -aG docker "$USER" || true

    print_success "Docker instalado"
}

wait_for_docker() {
    print_step "Aguardando Docker iniciar..."

    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker ps > /dev/null 2>&1; then
            print_success "Docker está funcionando"
            return 0
        fi

        if $SUDO docker ps > /dev/null 2>&1; then
            print_warning "Docker precisa de sudo (faça logout/login para usar sem sudo)"
            return 0
        fi

        sleep 2
        attempt=$((attempt + 1))
    done

    print_error "Docker não iniciou após ${max_attempts} tentativas"
    return 1
}

install_docker_compose() {
    print_step "Verificando Docker Compose..."

    if docker compose version > /dev/null 2>&1; then
        print_success "Docker Compose já instalado"
        return 0
    fi

    print_substep "Instalando Docker Compose plugin..."

    if command -v apt-get &> /dev/null; then
        $SUDO apt-get install -y -qq docker-compose-plugin > /dev/null 2>&1 || true

        if docker compose version > /dev/null 2>&1; then
            print_success "Docker Compose instalado"
            return 0
        fi
    fi

    print_substep "Instalando Docker Compose manualmente..."

    local compose_version="2.30.3"
    local os="$(uname -s | tr '[:upper:]' '[:lower:]')"
    local arch="$(uname -m)"

    case "$arch" in
        x86_64|amd64) arch="x86_64" ;;
        aarch64|arm64) arch="aarch64" ;;
    esac

    local docker_config="${DOCKER_CONFIG:-$HOME/.docker}"
    mkdir -p "$docker_config/cli-plugins"

    curl -fsSL "https://github.com/docker/compose/releases/download/v${compose_version}/docker-compose-${os}-${arch}" \
        -o "$docker_config/cli-plugins/docker-compose"

    chmod +x "$docker_config/cli-plugins/docker-compose"

    if docker compose version > /dev/null 2>&1; then
        print_success "Docker Compose instalado"
        return 0
    fi

    print_error "Falha ao instalar Docker Compose"
    return 1
}

start_docker_service() {
    print_step "Iniciando serviço Docker..."

    if command -v systemctl &> /dev/null; then
        $SUDO systemctl enable --now docker > /dev/null 2>&1 || true
        print_success "Serviço Docker iniciado"
    elif command -v service &> /dev/null; then
        $SUDO service docker start > /dev/null 2>&1 || true
        print_success "Serviço Docker iniciado"
    fi
}

# ===== SETUP DO TURION =====

setup_turion_directory() {
    print_step "Configurando diretório /opt/turion..."

    if [ -d "$TURION_DIR" ]; then
        print_warning "Diretório já existe, fazendo backup..."
        $SUDO mv "$TURION_DIR" "${TURION_DIR}.backup.$(date +%s)"
    fi

    $SUDO mkdir -p "$TURION_DIR"
    $SUDO chown "$USER":"$USER" "$TURION_DIR"

    print_success "Diretório criado"
}

clone_repository() {
    print_step "Clonando repositório do GitHub..."

    cd /opt

    if ! git clone --depth 1 "$TURION_REPO" turion > /dev/null 2>&1; then
        print_error "Falha ao clonar repositório"
        exit 1
    fi

    print_success "Repositório clonado"
}

create_directories() {
    print_step "Criando estrutura de diretórios..."

    cd "$TURION_DIR"

    mkdir -p state logs auth_info

    $SUDO chown -R ${TURION_UID}:${TURION_GID} state logs auth_info
    $SUDO chmod 755 state logs auth_info

    print_substep "state/ (UID:${TURION_UID} GID:${TURION_GID})"
    print_substep "logs/ (UID:${TURION_UID} GID:${TURION_GID})"
    print_substep "auth_info/ (UID:${TURION_UID} GID:${TURION_GID})"

    print_success "Diretórios criados"
}

generate_env_file() {
    print_step "Configurando variáveis de ambiente..."

    cd "$TURION_DIR"

    if [ -f ".env" ]; then
        print_warning ".env já existe, preservando..."
        return 0
    fi

    local owner_password=$(shuf -i 10000000-99999999 -n 1 2>/dev/null || echo "12345678")

    cat > .env << EOF
# ============================================
# Turion V1.1.1 - Variáveis de Ambiente
# ============================================
#
# INSTALAÇÃO: Docker (Profissional)
# Diretório: /opt/turion
#
# ============================================

# ===== SENHA DO PROPRIETÁRIO =====
TURION_OWNER_PASSWORD=${owner_password}

# ===== API KEYS (Configure antes de usar!) =====
ANTHROPIC_API_KEY=
XAI_API_KEY=
OPENAI_API_KEY=

# ===== FEATURE FLAGS BRAIN V2 =====
TURION_USE_GATEWAY=true
TURION_USE_ORCHESTRATOR=true
TURION_USE_MEMORY=true
TURION_AUTO_APPROVE=false

# ===== CONFIGURAÇÕES GERAIS =====
TURION_XAI_MODEL=grok-4-1-fast-reasoning
TURION_GATEWAY_DEDUPLICATION=true
TURION_GATEWAY_TTL=300000
TURION_ALLOWLIST=
TURION_TIMEZONE=America/Sao_Paulo

# ===== SUPABASE (Opcional) =====
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_PASSWORD=
EOF

    chmod 600 .env

    print_substep "Senha do proprietário: ${BOLD}${owner_password}${NC}"
    print_warning "Configure ANTHROPIC_API_KEY no arquivo .env antes de iniciar!"
    print_success "Arquivo .env criado"
}

# ===== DOCKER =====

start_docker_containers() {
    print_step "Iniciando containers Docker..."

    cd "$TURION_DIR"

    docker compose down > /dev/null 2>&1 || true

    if docker compose up -d --build > /dev/null 2>&1; then
        print_success "Containers iniciados"
    else
        if $SUDO docker compose up -d --build > /dev/null 2>&1; then
            print_warning "Containers iniciados com sudo"
        else
            print_error "Falha ao iniciar containers"
            return 1
        fi
    fi

    sleep 5
}

validate_installation() {
    print_step "Validando instalação..."

    cd "$TURION_DIR"

    if ! docker ps | grep -q turion; then
        print_error "Container não está rodando"
        docker compose logs --tail 20
        return 1
    fi

    print_substep "Container rodando"

    if [ ! -f ".env" ]; then
        print_error ".env não existe"
        return 1
    fi

    print_substep "Arquivo .env OK"

    for dir in state logs auth_info; do
        if [ ! -d "$dir" ]; then
            print_error "Diretório $dir não existe"
            return 1
        fi
    done

    print_substep "Diretórios OK"

    print_success "Instalação validada"
}

# ===== QR CODE =====

show_qr_code() {
    print_box "CONECTAR WHATSAPP" "$CYAN"

    echo -e "${WHITE}Aguardando QR Code ser gerado...${NC}"
    echo -e "${DIM}Isso pode levar até 30 segundos${NC}"
    echo ""

    cd "$TURION_DIR"

    timeout 60 docker compose logs -f 2>/dev/null | grep --line-buffered "QR" | head -1 || true

    echo ""
    echo -e "${CYAN}Para ver o QR Code completo:${NC}"
    echo -e "  ${BOLD}cd /opt/turion && docker compose logs -f turion${NC}"
    echo ""
}

# ===== PÓS-INSTALAÇÃO =====

show_completion() {
    print_box "INSTALAÇÃO CONCLUÍDA!" "$GREEN"

    echo -e "${WHITE}Turion V1.1.1 instalado com sucesso!${NC}"
    echo ""
    echo -e "${BOLD}Próximos passos:${NC}"
    echo ""
    echo -e "1. ${CYAN}Configure sua API Key:${NC}"
    echo -e "   nano /opt/turion/.env"
    echo -e "   ${DIM}(Adicione ANTHROPIC_API_KEY)${NC}"
    echo ""
    echo -e "2. ${CYAN}Reinicie o container:${NC}"
    echo -e "   cd /opt/turion && docker compose restart"
    echo ""
    echo -e "3. ${CYAN}Ver logs e QR Code:${NC}"
    echo -e "   docker compose logs -f turion"
    echo ""
    echo -e "4. ${CYAN}Comandos úteis:${NC}"
    echo -e "   docker compose ps          ${DIM}# Status${NC}"
    echo -e "   docker compose logs -f     ${DIM}# Logs em tempo real${NC}"
    echo -e "   docker compose restart     ${DIM}# Reiniciar${NC}"
    echo -e "   docker compose down        ${DIM}# Parar${NC}"
    echo ""
    echo -e "${DIM}Instalado em: /opt/turion${NC}"
    echo -e "${DIM}Documentação: https://github.com/LucasBolla94/turionai${NC}"
    echo ""
}

# ===== MAIN =====

main() {
    print_header

    print_box "INICIANDO INSTALAÇÃO" "$CYAN"

    # FASE 1: Validações
    check_root_or_sudo
    check_disk_space
    check_connectivity

    # FASE 2: Atualização do sistema
    update_system

    # FASE 3: Dependências
    install_dependencies

    # FASE 4: Docker
    install_docker
    wait_for_docker
    install_docker_compose
    start_docker_service

    # FASE 5: Setup Turion
    setup_turion_directory
    clone_repository
    create_directories
    generate_env_file

    # FASE 6: Docker Containers
    start_docker_containers
    validate_installation

    # FASE 7: QR Code (se API Key configurada)
    if grep -q "^ANTHROPIC_API_KEY=sk-ant-" /opt/turion/.env 2>/dev/null; then
        show_qr_code
    else
        print_warning "Configure ANTHROPIC_API_KEY antes de conectar ao WhatsApp"
    fi

    # FASE 8: Conclusão
    show_completion
}

# Executar
trap 'print_error "Instalação interrompida"; exit 1' INT TERM
main
