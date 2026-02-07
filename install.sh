#!/bin/bash
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
#   Uso: curl -fsSL https://raw.githubusercontent.com/LucasBolla94/turionai/main/install.sh | sudo bash
#
# ============================================================================

set -eo pipefail

# ===== CONFIGURACOES =====
TURION_DIR="/opt/turion"
TURION_REPO="https://github.com/LucasBolla94/turionai.git"
TURION_UID=1001
TURION_GID=1001
MIN_DISK_MB=2048

# ===== CORES =====
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
DIM='\033[0;2m'
NC='\033[0m'

# ===== FUNCOES DE PRINT =====

print_header() {
    clear
    echo -e "${CYAN}"
    echo '    ████████╗██╗   ██╗██████╗ ██╗ ██████╗ ███╗   ██╗'
    echo '    ╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗████╗  ██║'
    echo '       ██║   ██║   ██║██████╔╝██║██║   ██║██╔██╗ ██║'
    echo '       ██║   ██║   ██║██╔══██╗██║██║   ██║██║╚██╗██║'
    echo '       ██║   ╚██████╔╝██║  ██║██║╚██████╔╝██║ ╚████║'
    echo '       ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝'
    echo -e "${NC}"
    echo -e "${WHITE}        Assistente Pessoal via WhatsApp${NC}"
    echo -e "${DIM}           Versao 1.1.1 - Instalacao Profissional${NC}"
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
    echo -e "  ${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "  ${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "  ${RED}✗${NC} $1"
}

print_box() {
    local text="$1"
    local color="${2:-$GREEN}"
    echo ""
    echo -e "${color}══════════════════════════════════════════════════════════════${NC}"
    echo -e "${color}  ${text}${NC}"
    echo -e "${color}══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# ===== FASE 1: VALIDACOES =====

check_root() {
    print_step "Verificando privilegios..."

    if [ "$(id -u)" -ne 0 ]; then
        print_error "Este script precisa ser executado como root (use sudo)"
        echo ""
        echo -e "  Execute: ${BOLD}curl -fsSL https://raw.githubusercontent.com/LucasBolla94/turionai/main/install.sh | sudo bash${NC}"
        exit 1
    fi

    print_success "Executando como root"
}

check_os() {
    print_step "Verificando sistema operacional..."

    if [ ! -f /etc/os-release ]; then
        print_error "Sistema operacional nao suportado (sem /etc/os-release)"
        exit 1
    fi

    . /etc/os-release
    print_substep "Detectado: ${PRETTY_NAME:-$ID}"
    print_success "Sistema operacional OK"
}

check_disk_space() {
    print_step "Verificando espaco em disco..."

    local available_mb
    available_mb=$(df / | tail -1 | awk '{print int($4/1024)}')

    if [ "$available_mb" -lt "$MIN_DISK_MB" ]; then
        print_error "Espaco insuficiente: ${available_mb}MB disponivel, ${MIN_DISK_MB}MB necessario"
        exit 1
    fi

    print_substep "${available_mb}MB disponivel"
    print_success "Espaco em disco OK"
}

check_connectivity() {
    print_step "Verificando conectividade..."

    if ! curl -fsSL --connect-timeout 10 https://github.com > /dev/null 2>&1; then
        print_error "Sem conectividade com GitHub"
        exit 1
    fi

    print_success "Conectividade OK"
}

# ===== FASE 2: UPDATE DO SISTEMA =====

update_system() {
    print_step "Atualizando sistema..."

    if command -v apt-get > /dev/null 2>&1; then
        print_substep "Executando apt-get update..."
        apt-get update -qq > /dev/null 2>&1
        print_substep "Executando apt-get upgrade (pode demorar)..."
        DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq \
            -o Dpkg::Options::="--force-confdef" \
            -o Dpkg::Options::="--force-confold" > /dev/null 2>&1
        print_success "Sistema atualizado (apt)"

    elif command -v yum > /dev/null 2>&1; then
        print_substep "Executando yum update..."
        yum update -y -q > /dev/null 2>&1
        print_success "Sistema atualizado (yum)"

    elif command -v dnf > /dev/null 2>&1; then
        print_substep "Executando dnf update..."
        dnf update -y -q > /dev/null 2>&1
        print_success "Sistema atualizado (dnf)"

    else
        print_warning "Gerenciador de pacotes nao reconhecido, pulando update"
    fi
}

# ===== FASE 3: DEPENDENCIAS =====

install_dependencies() {
    print_step "Instalando dependencias..."

    if command -v apt-get > /dev/null 2>&1; then
        apt-get install -y -qq git curl ca-certificates gnupg lsb-release > /dev/null 2>&1
    elif command -v yum > /dev/null 2>&1; then
        yum install -y -q git curl ca-certificates > /dev/null 2>&1
    elif command -v dnf > /dev/null 2>&1; then
        dnf install -y -q git curl ca-certificates > /dev/null 2>&1
    fi

    # Verificar se git e curl estao instalados
    if ! command -v git > /dev/null 2>&1; then
        print_error "Falha ao instalar git"
        exit 1
    fi

    if ! command -v curl > /dev/null 2>&1; then
        print_error "Falha ao instalar curl"
        exit 1
    fi

    print_success "Dependencias instaladas (git, curl, ca-certificates)"
}

# ===== FASE 4: DOCKER =====

install_docker() {
    print_step "Instalando Docker..."

    if command -v docker > /dev/null 2>&1 && docker info > /dev/null 2>&1; then
        local docker_ver
        docker_ver=$(docker --version | cut -d' ' -f3 | tr -d ',')
        print_success "Docker ja instalado (${docker_ver})"
    else
        print_substep "Baixando e instalando Docker..."

        curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
        sh /tmp/get-docker.sh > /dev/null 2>&1
        rm -f /tmp/get-docker.sh

        if ! command -v docker > /dev/null 2>&1; then
            print_error "Falha ao instalar Docker"
            exit 1
        fi

        print_success "Docker instalado"
    fi

    # Garantir que o servico esta rodando
    print_substep "Iniciando servico Docker..."

    if command -v systemctl > /dev/null 2>&1; then
        systemctl enable docker > /dev/null 2>&1 || true
        systemctl start docker > /dev/null 2>&1 || true
    elif command -v service > /dev/null 2>&1; then
        service docker start > /dev/null 2>&1 || true
    fi

    # Aguardar Docker ficar pronto
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if docker info > /dev/null 2>&1; then
            print_success "Docker esta funcionando"
            break
        fi
        sleep 2
        attempts=$((attempts + 1))
    done

    if [ $attempts -ge 30 ]; then
        print_error "Docker nao iniciou apos 60 segundos"
        exit 1
    fi
}

install_docker_compose() {
    print_step "Verificando Docker Compose..."

    if docker compose version > /dev/null 2>&1; then
        print_success "Docker Compose ja instalado"
        return 0
    fi

    print_substep "Instalando Docker Compose plugin..."

    # Tentar via apt
    if command -v apt-get > /dev/null 2>&1; then
        apt-get install -y -qq docker-compose-plugin > /dev/null 2>&1 || true
    fi

    if docker compose version > /dev/null 2>&1; then
        print_success "Docker Compose instalado"
        return 0
    fi

    # Instalar manualmente
    print_substep "Instalando Docker Compose manualmente..."

    local compose_version="2.30.3"
    local os
    os=$(uname -s | tr '[:upper:]' '[:lower:]')
    local arch
    arch=$(uname -m)

    case "$arch" in
        x86_64|amd64) arch="x86_64" ;;
        aarch64|arm64) arch="aarch64" ;;
    esac

    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -fsSL "https://github.com/docker/compose/releases/download/v${compose_version}/docker-compose-${os}-${arch}" \
        -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

    if docker compose version > /dev/null 2>&1; then
        print_success "Docker Compose instalado"
    else
        print_error "Falha ao instalar Docker Compose"
        exit 1
    fi
}

# ===== FASE 5: CLONAR REPOSITORIO =====

clone_repository() {
    print_step "Preparando repositorio..."

    if [ -d "$TURION_DIR" ]; then
        if [ -d "$TURION_DIR/.git" ]; then
            print_substep "Repositorio ja existe, atualizando..."
            cd "$TURION_DIR"
            git fetch --depth 1 origin main > /dev/null 2>&1
            git reset --hard origin/main > /dev/null 2>&1
            print_success "Repositorio atualizado"
            return 0
        else
            print_substep "Diretorio existe mas nao e um repo git, removendo..."
            rm -rf "$TURION_DIR"
        fi
    fi

    print_substep "Clonando repositorio..."
    git clone --depth 1 "$TURION_REPO" "$TURION_DIR" > /dev/null 2>&1

    if [ ! -d "$TURION_DIR/.git" ]; then
        print_error "Falha ao clonar repositorio"
        exit 1
    fi

    print_success "Repositorio clonado em ${TURION_DIR}"
}

# ===== FASE 6: CONFIGURAR DIRETORIOS E .ENV =====

setup_directories() {
    print_step "Criando diretorios persistentes..."

    cd "$TURION_DIR"

    mkdir -p state logs auth_info

    chown -R ${TURION_UID}:${TURION_GID} state logs auth_info 2>/dev/null || true
    chmod 755 state logs auth_info

    print_substep "state/  - dados persistentes"
    print_substep "logs/   - logs da aplicacao"
    print_substep "auth_info/ - autenticacao WhatsApp"
    print_success "Diretorios criados"
}

generate_env() {
    print_step "Configurando variaveis de ambiente..."

    cd "$TURION_DIR"

    if [ -f ".env" ]; then
        print_warning ".env ja existe, preservando configuracao atual"
        return 0
    fi

    # Copiar do .env.example se existir, senao criar
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_substep "Copiado de .env.example"
    else
        cat > .env << 'ENVEOF'
# Turion V1.1.1 - Environment Variables

# ============================================
# API KEYS (Configure via WhatsApp ou aqui)
# ============================================
ANTHROPIC_API_KEY=
XAI_API_KEY=
OPENAI_API_KEY=

# ============================================
# FEATURE FLAGS (V1.1.1)
# ============================================
TURION_USE_GATEWAY=false
TURION_USE_ORCHESTRATOR=false
TURION_USE_MEMORY=false
TURION_AUTO_APPROVE=false

# ============================================
# GATEWAY CONFIG
# ============================================
TURION_GATEWAY_DEDUPLICATION=true
TURION_GATEWAY_TTL=300000

# ============================================
# CONFIG
# ============================================
TURION_XAI_MODEL=grok-4-1-fast-reasoning
TURION_ALLOWLIST=
TURION_TIMEZONE=America/Sao_Paulo

# ============================================
# SUPABASE (Opcional)
# ============================================
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_PASSWORD=
ENVEOF
        print_substep "Arquivo .env criado"
    fi

    chown ${TURION_UID}:${TURION_GID} .env
    chmod 660 .env
    print_success "Arquivo .env configurado"
    print_warning "A API Key sera configurada pelo WhatsApp durante o setup inicial!"
}

# ===== FASE 7: BUILD E START DOS CONTAINERS =====

start_containers() {
    print_step "Construindo e iniciando containers Docker..."

    cd "$TURION_DIR"

    # Parar containers antigos se existirem
    docker compose down > /dev/null 2>&1 || true

    # Build
    print_substep "Construindo imagem (pode demorar alguns minutos)..."
    if ! docker compose build 2>&1 | tail -5; then
        print_error "Falha ao construir imagem Docker"
        echo ""
        echo -e "  ${YELLOW}Verifique os logs acima para mais detalhes${NC}"
        exit 1
    fi

    # Start
    print_substep "Iniciando container..."
    if ! docker compose up -d 2>&1; then
        print_error "Falha ao iniciar container"
        exit 1
    fi

    print_success "Container iniciado"

    # Aguardar container ficar healthy
    print_substep "Aguardando container ficar pronto (ate 60s)..."
    local attempts=0
    while [ $attempts -lt 30 ]; do
        local status
        status=$(docker inspect --format='{{.State.Health.Status}}' turion 2>/dev/null || echo "starting")

        if [ "$status" = "healthy" ]; then
            print_success "Container saudavel e funcionando"
            return 0
        fi

        # Verificar se o container crashou
        local running
        running=$(docker inspect --format='{{.State.Running}}' turion 2>/dev/null || echo "false")
        if [ "$running" = "false" ]; then
            print_error "Container parou inesperadamente"
            echo ""
            echo -e "  ${YELLOW}Logs do container:${NC}"
            docker compose logs --tail 30 turion 2>/dev/null || true
            exit 1
        fi

        sleep 2
        attempts=$((attempts + 1))
    done

    # Se nao ficou healthy mas ainda esta rodando, tudo bem
    local running
    running=$(docker inspect --format='{{.State.Running}}' turion 2>/dev/null || echo "false")
    if [ "$running" = "true" ]; then
        print_success "Container rodando (health check ainda pendente)"
    else
        print_error "Container nao iniciou corretamente"
        docker compose logs --tail 20 turion 2>/dev/null || true
        exit 1
    fi
}

# ===== FASE 8: EXIBIR QR CODE =====

show_qr_code() {
    print_box "CONECTAR WHATSAPP" "$CYAN"

    echo -e "${WHITE}Os logs do container serao exibidos abaixo.${NC}"
    echo -e "${WHITE}Escaneie o QR Code com seu WhatsApp quando aparecer.${NC}"
    echo -e "${DIM}(WhatsApp > Menu > Aparelhos conectados > Conectar aparelho)${NC}"
    echo ""
    echo -e "${YELLOW}Pressione Ctrl+C para sair dos logs quando terminar.${NC}"
    echo ""

    cd "$TURION_DIR"

    # Mostrar logs em tempo real por 120 segundos (ou ate Ctrl+C)
    timeout 120 docker compose logs -f turion 2>/dev/null || true
    echo ""
}

# ===== FASE 9: CONCLUSAO =====

show_completion() {
    print_box "INSTALACAO CONCLUIDA COM SUCESSO!" "$GREEN"

    echo -e "${WHITE}Turion V1.1.1 instalado em: ${BOLD}/opt/turion${NC}"
    echo ""
    echo -e "${BOLD}${CYAN}Proximos passos:${NC}"
    echo ""
    echo -e "  ${WHITE}1.${NC} Configure suas API Keys:"
    echo -e "     ${BOLD}nano /opt/turion/.env${NC}"
    echo ""
    echo -e "  ${WHITE}2.${NC} Reinicie o container:"
    echo -e "     ${BOLD}cd /opt/turion && docker compose restart${NC}"
    echo ""
    echo -e "  ${WHITE}3.${NC} Veja os logs e escaneie o QR Code:"
    echo -e "     ${BOLD}cd /opt/turion && docker compose logs -f turion${NC}"
    echo ""
    echo -e "${BOLD}${CYAN}Comandos uteis:${NC}"
    echo ""
    echo -e "  ${BOLD}cd /opt/turion${NC}"
    echo -e "  ${BOLD}docker compose ps${NC}            ${DIM}# Ver status${NC}"
    echo -e "  ${BOLD}docker compose logs -f turion${NC} ${DIM}# Ver logs em tempo real${NC}"
    echo -e "  ${BOLD}docker compose restart${NC}        ${DIM}# Reiniciar${NC}"
    echo -e "  ${BOLD}docker compose down${NC}           ${DIM}# Parar${NC}"
    echo -e "  ${BOLD}docker compose up -d --build${NC}  ${DIM}# Reconstruir e iniciar${NC}"
    echo ""
    echo -e "${DIM}Documentacao: https://github.com/LucasBolla94/turionai${NC}"
    echo ""
}

# ===== MAIN =====

main() {
    print_header
    print_box "INICIANDO INSTALACAO" "$CYAN"

    # Fase 1: Validacoes
    check_root
    check_os
    check_disk_space
    check_connectivity

    # Fase 2: Update do sistema
    update_system

    # Fase 3: Dependencias
    install_dependencies

    # Fase 4: Docker
    install_docker
    install_docker_compose

    # Fase 5: Clonar repositorio
    clone_repository

    # Fase 6: Diretorios e .env
    setup_directories
    generate_env

    # Fase 7: Build e start
    start_containers

    # Fase 8: Conclusao
    show_completion

    # Fase 9: Exibir QR Code (logs em tempo real)
    show_qr_code
}

trap 'echo ""; print_error "Instalacao interrompida pelo usuario"; exit 1' INT TERM
main
