#!/bin/bash

###############################################################################
#
#   ████████╗██╗   ██╗██████╗ ██╗ ██████╗ ███╗   ██╗
#   ╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗████╗  ██║
#      ██║   ██║   ██║██████╔╝██║██║   ██║██╔██╗ ██║
#      ██║   ██║   ██║██╔══██╗██║██║   ██║██║╚██╗██║
#      ██║   ╚██████╔╝██║  ██║██║╚██████╔╝██║ ╚████║
#      ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝
#
#   Instalador Docker - V1.1.1
#   Linux / macOS
#
###############################################################################

set -e  # Exit on error

# ===== CONFIGURAÇÕES =====
INSTALL_DIR="${TURION_INSTALL_DIR:-$HOME/turion}"
REPO_URL="https://github.com/LucasBolla94/turionai.git"
IS_PIPE_MODE=false

# Detectar se está executando via pipe (curl | bash)
if [ ! -t 0 ]; then
    IS_PIPE_MODE=true
fi

# ===== CORES =====
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
DIM='\033[0;2m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ===== FUNÇÕES DE PRINT =====
print_header() {
    clear
    echo -e "${CYAN}"
    echo "████████╗██╗   ██╗██████╗ ██╗ ██████╗ ███╗   ██╗"
    echo "╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗████╗  ██║"
    echo "   ██║   ██║   ██║██████╔╝██║██║   ██║██╔██╗ ██║"
    echo "   ██║   ██║   ██║██╔══██╗██║██║   ██║██║╚██╗██║"
    echo "   ██║   ╚██████╔╝██║  ██║██║╚██████╔╝██║ ╚████║"
    echo "   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝"
    echo -e "${NC}"
    echo -e "${WHITE}        🤖 Assistente Pessoal via WhatsApp${NC}"
    echo -e "${DIM}           Versão 1.1.1 - Brain System V2${NC}"
    echo -e "${DIM}              🐳 Instalação Docker${NC}"
    echo ""
}

print_box() {
    local text="$1"
    local color="${2:-$GREEN}"
    local width=60
    local padding=$(( (width - ${#text} - 2) / 2 ))

    echo ""
    echo -e "${color}╔$(printf '═%.0s' {1..60})╗${NC}"
    echo -e "${color}║$(printf ' %.0s' $(seq 1 $padding))${text}$(printf ' %.0s' $(seq 1 $((width - padding - ${#text}))))║${NC}"
    echo -e "${color}╚$(printf '═%.0s' {1..60})╝${NC}"
    echo ""
}

print_step() {
    echo -e "${BOLD}${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# ===== FUNÇÕES DE VERIFICAÇÃO =====
check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

check_docker() {
    if check_command docker; then
        if docker --version &> /dev/null; then
            print_success "Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1) instalado"
            return 0
        fi
    fi
    return 1
}

check_docker_compose() {
    if docker compose version &> /dev/null; then
        print_success "Docker Compose $(docker compose version --short) instalado"
        return 0
    elif check_command docker-compose; then
        print_success "Docker Compose $(docker-compose --version | cut -d' ' -f4 | cut -d',' -f1) instalado (legacy)"
        return 0
    fi
    return 1
}

check_git() {
    if check_command git; then
        print_success "Git $(git --version | cut -d' ' -f3) instalado"
        return 0
    else
        return 1
    fi
}

# ===== INSTALAÇÃO =====
install_git() {
    print_step "Instalando Git..."

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if check_command apt-get; then
            sudo apt-get update -qq
            sudo apt-get install -y git -qq
        elif check_command yum; then
            sudo yum install -y git -q
        elif check_command dnf; then
            sudo dnf install -y git -q
        else
            print_error "Gerenciador de pacotes não suportado. Instale Git manualmente."
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if check_command brew; then
            brew install git
        else
            xcode-select --install
        fi
    else
        print_error "Sistema operacional não suportado"
        exit 1
    fi

    print_success "Git instalado!"
}

install_docker() {
    print_step "Instalando Docker..."

    # Usar script oficial do Docker
    curl -fsSL https://get.docker.com | sh > /dev/null 2>&1

    # Adicionar usuário ao grupo docker
    sudo usermod -aG docker "$USER" || true

    print_success "Docker instalado!"
    print_warning "Você pode precisar fazer logout/login para usar Docker sem sudo"
}

install_docker_compose() {
    print_step "Instalando Docker Compose..."

    # Tentar instalar plugin primeiro (método recomendado)
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if check_command apt-get; then
            sudo apt-get update -qq
            # Tentar diferentes pacotes
            sudo apt-get install -y docker-compose-plugin -qq 2>/dev/null || \
            sudo apt-get install -y docker-compose-v2 -qq 2>/dev/null || \
            sudo apt-get install -y docker-compose -qq 2>/dev/null || true

            if docker compose version &> /dev/null || docker-compose version &> /dev/null; then
                print_success "Docker Compose instalado via apt!"
                return 0
            fi
        fi
    fi

    # Fallback: instalar como plugin do usuário
    print_info "Instalando Docker Compose como plugin do usuário..."
    COMPOSE_VERSION="2.30.3"
    OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
    ARCH="$(uname -m)"

    case "$ARCH" in
        x86_64|amd64) ARCH="x86_64" ;;
        aarch64|arm64) ARCH="aarch64" ;;
    esac

    DOCKER_CONFIG="${DOCKER_CONFIG:-$HOME/.docker}"
    mkdir -p "$DOCKER_CONFIG/cli-plugins"

    curl -fsSL "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-${OS}-${ARCH}" \
         -o "$DOCKER_CONFIG/cli-plugins/docker-compose"
    chmod +x "$DOCKER_CONFIG/cli-plugins/docker-compose"

    if docker compose version &> /dev/null; then
        print_success "Docker Compose instalado!"
        return 0
    fi

    print_error "Não foi possível instalar Docker Compose automaticamente"
    print_info "Por favor, instale manualmente: https://docs.docker.com/compose/install/"
    exit 1
}

start_docker_service() {
    print_step "Iniciando serviço Docker..."

    if check_command systemctl; then
        sudo systemctl enable docker --now &> /dev/null || true
        if systemctl is-active --quiet docker; then
            print_success "Docker está rodando!"
            return 0
        fi
    fi

    if check_command service; then
        sudo service docker start &> /dev/null || true
    fi

    # Verificar se Docker está acessível
    if docker ps &> /dev/null || sudo docker ps &> /dev/null; then
        print_success "Docker está rodando!"
        return 0
    fi

    print_warning "Não foi possível verificar se Docker está rodando"
    print_info "Você pode precisar iniciar o Docker manualmente"
}

# ===== DETECÇÃO DE INSTALAÇÃO EXISTENTE =====
find_existing_installation() {
    # Procurar em locais comuns
    local possible_locations=(
        "$INSTALL_DIR"
        "$HOME/turionai"
        "/opt/turion"
        "/opt/turionai"
    )

    for location in "${possible_locations[@]}"; do
        if [ -d "$location" ] && [ -f "$location/docker-compose.yml" ]; then
            echo "$location"
            return 0
        fi
    done

    return 1
}

handle_existing_installation() {
    local existing_dir="$1"

    print_header
    print_box "INSTALAÇÃO EXISTENTE DETECTADA" "$YELLOW"

    echo ""
    echo -e "${WHITE}Turion já está instalado em: ${CYAN}$existing_dir${NC}"
    echo ""
    echo -e "${YELLOW}O que você deseja fazer?${NC}"
    echo ""
    echo -e "${CYAN}1)${NC} Atualizar ${BOLD}preservando${NC} configurações (.env)"
    echo -e "${CYAN}2)${NC} Reinstalar ${BOLD}limpando${NC} tudo (nova senha será gerada)"
    echo -e "${CYAN}3)${NC} Cancelar instalação"
    echo ""

    # Se estiver em modo pipe, preservar por padrão
    if [ "$IS_PIPE_MODE" = true ]; then
        print_info "Modo automático: preservando configurações..."
        sleep 2
        REPLY="1"
    else
        read -p "$(echo -e ${YELLOW}"Escolha uma opção (1/2/3): "${NC})" -n 1 -r
        echo ""
        echo ""
    fi

    case $REPLY in
        1)
            print_step "Atualização com preservação de configurações selecionada"
            INSTALL_DIR="$existing_dir"
            return 1  # Retorna 1 para indicar "preservar .env"
            ;;
        2)
            print_step "Reinstalação limpa selecionada"
            # Fazer backup do .env antigo
            if [ -f "$existing_dir/.env" ]; then
                print_step "Fazendo backup de .env antigo..."
                cp "$existing_dir/.env" "$existing_dir/.env.backup.$(date +%Y%m%d_%H%M%S)"
                print_success "Backup criado!"
            fi
            INSTALL_DIR="$existing_dir"
            return 0  # Retorna 0 para indicar "reset"
            ;;
        3|*)
            print_info "Instalação cancelada"
            exit 0
            ;;
    esac
}

# ===== INSTALAÇÃO DO TURION =====
install_turion() {
    local preserve_env=false

    # Verificar se já existe instalação
    existing_installation=$(find_existing_installation)
    if [ $? -eq 0 ]; then
        handle_existing_installation "$existing_installation"
        preserve_env=$?  # 0 = reset, 1 = preserve

        # Parar containers se estiverem rodando
        print_step "Parando containers se estiverem rodando..."
        cd "$INSTALL_DIR"
        docker-compose down 2>/dev/null || sudo docker-compose down 2>/dev/null || \
        docker compose down 2>/dev/null || sudo docker compose down 2>/dev/null || true
        print_success "Containers parados!"

        # Preservar .env se necessário
        if [ $preserve_env -eq 1 ] && [ -f "$INSTALL_DIR/.env" ]; then
            print_step "Preservando configurações..."
            cp "$INSTALL_DIR/.env" "/tmp/turion_env_backup"
        fi
    else
        print_header
        print_box "INSTALANDO TURION" "$MAGENTA"
    fi

    # Criar/limpar diretório
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"

    # Baixar do GitHub
    print_step "Baixando Turion do GitHub..."

    if [ -d ".git" ]; then
        # Se já é um repositório, fazer pull
        git pull --quiet origin main
    else
        # Limpar diretório e clonar
        rm -rf * .git 2>/dev/null || true
        git clone --quiet "$REPO_URL" temp_clone
        mv temp_clone/* temp_clone/.* . 2>/dev/null || true
        rm -rf temp_clone
    fi

    print_success "Turion baixado!"

    # Restaurar .env se foi preservado
    if [ $preserve_env -eq 1 ] && [ -f "/tmp/turion_env_backup" ]; then
        print_step "Restaurando configurações preservadas..."
        cp "/tmp/turion_env_backup" "$INSTALL_DIR/.env"
        rm "/tmp/turion_env_backup"
        print_success "Configurações restauradas!"
    fi

    # Criar diretórios necessários
    print_step "Criando diretórios..."
    mkdir -p logs state auth_info
    print_success "Diretórios criados!"

    # Ajustar permissões
    print_step "Ajustando permissões..."
    sudo chown -R 1000:1000 state logs auth_info 2>/dev/null || \
    chown -R 1000:1000 state logs auth_info 2>/dev/null || true
    print_success "Permissões ajustadas!"

    # Retornar preserve_env para uso posterior
    return $preserve_env
}

# ===== CONFIGURAÇÃO =====
run_setup() {
    local preserve_env="$1"  # Recebe se deve preservar .env

    print_header
    print_box "CONFIGURAÇÃO AUTOMÁTICA" "$CYAN"

    echo ""

    # Se .env já existe e foi preservado, não recriar
    if [ $preserve_env -eq 1 ] && [ -f .env ]; then
        print_success "Configurações preservadas do .env existente!"
        echo ""

        # Ler senha existente
        OWNER_PASSWORD=$(grep TURION_OWNER_PASSWORD .env 2>/dev/null | cut -d'=' -f2 || echo "")

        if [ -n "$OWNER_PASSWORD" ]; then
            print_info "Senha do proprietário (existente): ${BOLD}${YELLOW}${OWNER_PASSWORD}${NC}"
        else
            print_warning "Senha do proprietário não encontrada no .env"
        fi

        echo ""
        sleep 2
        return 0
    fi

    # Gerar nova senha
    print_step "Gerando senha de acesso do proprietário..."

    # Gerar senha de 8 números aleatória
    OWNER_PASSWORD=$(shuf -i 10000000-99999999 -n 1 2>/dev/null || echo $((10000000 + RANDOM * RANDOM % 90000000)))

    print_success "Senha gerada: ${BOLD}${YELLOW}${OWNER_PASSWORD}${NC}"
    echo ""

    print_step "Criando arquivo .env..."

    # Criar .env completo
    cat > .env << EOF
# ============================================
# Turion V1.1.1 - Environment Variables
# ============================================

# ===== SENHA DO PROPRIETÁRIO (IMPORTANTE!) =====
# Use esta senha para autenticar como dono no WhatsApp
TURION_OWNER_PASSWORD=${OWNER_PASSWORD}

# ===== API KEYS (Configure antes de usar!) =====
ANTHROPIC_API_KEY=
XAI_API_KEY=
OPENAI_API_KEY=

# ===== FEATURE FLAGS (V1.1.1) =====
TURION_USE_GATEWAY=true
TURION_USE_ORCHESTRATOR=true
TURION_USE_MEMORY=true
TURION_AUTO_APPROVE=false

# ===== GATEWAY CONFIG =====
TURION_GATEWAY_DEDUPLICATION=true
TURION_GATEWAY_TTL=300000

# ===== CONFIGURAÇÕES GERAIS =====
TURION_XAI_MODEL=grok-4-1-fast-reasoning
TURION_ALLOWLIST=
TURION_TIMEZONE=America/Sao_Paulo
EOF

    print_success "Arquivo .env criado!"
    echo ""
    print_warning "⚠️  IMPORTANTE: Configure suas API Keys no .env!"
    print_info "   Edite o arquivo: nano $INSTALL_DIR/.env"
    print_info "   Adicione pelo menos ANTHROPIC_API_KEY"
    echo ""
    sleep 3
}

# ===== DOCKER COMPOSE =====
start_containers() {
    print_header
    print_box "INICIANDO CONTAINERS" "$BLUE"

    cd "$INSTALL_DIR"

    print_step "Parando containers antigos..."
    docker-compose down 2>/dev/null || docker compose down 2>/dev/null || \
    sudo docker-compose down 2>/dev/null || sudo docker compose down 2>/dev/null || true

    print_step "Removendo sessão WhatsApp antiga (QR Code novo será gerado)..."
    rm -rf state/baileys 2>/dev/null || true

    print_step "Iniciando containers com Docker Compose..."

    # Tentar diferentes comandos
    if docker compose up -d --force-recreate 2>/dev/null; then
        print_success "Containers iniciados com docker compose!"
    elif docker-compose up -d --force-recreate 2>/dev/null; then
        print_success "Containers iniciados com docker-compose (legacy)!"
    elif sudo docker compose up -d --force-recreate 2>/dev/null; then
        print_success "Containers iniciados com sudo docker compose!"
    elif sudo docker-compose up -d --force-recreate 2>/dev/null; then
        print_success "Containers iniciados com sudo docker-compose!"
    else
        print_error "Falha ao iniciar containers"
        print_info "Tentando com logs verbose..."
        docker compose up -d --force-recreate || docker-compose up -d --force-recreate
    fi

    sleep 3

    # Verificar se container está rodando
    if docker ps | grep -q turion; then
        print_success "Container Turion está rodando!"
    elif sudo docker ps | grep -q turion; then
        print_success "Container Turion está rodando!"
    else
        print_warning "Não foi possível verificar status do container"
    fi
}

# ===== CRIAR SCRIPT DE MONITORAMENTO =====
create_watch_script() {
    print_step "Criando script de monitoramento de QR Code..."

    cat > watch-qr-docker.sh << 'EOFSCRIPT'
#!/bin/bash

# Script para monitorar QR Code do WhatsApp em tempo real
# Turion V1.1.1 - Docker

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       MONITOR DE QR CODE - TURION V1.1.1 (DOCKER)        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Monitorando logs do Docker...${NC}"
echo -e "${YELLOW}Quando o QR Code aparecer, escaneie com seu WhatsApp${NC}"
echo ""
echo -e "${GREEN}Pressione Ctrl+C para sair${NC}"
echo ""
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Seguir logs do Docker
if command -v docker-compose &> /dev/null; then
    docker-compose logs -f turion 2>/dev/null || docker compose logs -f turion 2>/dev/null || sudo docker-compose logs -f turion 2>/dev/null || sudo docker compose logs -f turion
elif command -v docker &> /dev/null; then
    docker logs -f turion 2>/dev/null || sudo docker logs -f turion
else
    echo "Docker não encontrado!"
    exit 1
fi
EOFSCRIPT

    chmod +x watch-qr-docker.sh
    print_success "Script watch-qr-docker.sh criado!"
}

# ===== FINALIZAÇÃO =====
show_final_message() {
    print_header
    print_box "INSTALAÇÃO CONCLUÍDA! 🎉" "$GREEN"

    # Ler senha do .env
    OWNER_PASSWORD=$(grep TURION_OWNER_PASSWORD .env | cut -d'=' -f2)

    echo -e "${WHITE}✅ Turion foi instalado e iniciado com Docker!${NC}"
    echo ""
    echo -e "${BOLD}${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${YELLOW}║              SENHA DO PROPRIETÁRIO                        ║${NC}"
    echo -e "${BOLD}${YELLOW}║                                                            ║${NC}"
    echo -e "${BOLD}${YELLOW}║              ${WHITE}${OWNER_PASSWORD}${YELLOW}                                  ║${NC}"
    echo -e "${BOLD}${YELLOW}║                                                            ║${NC}"
    echo -e "${BOLD}${YELLOW}║  ⚠️  Guarde esta senha! Você vai usar no WhatsApp          ║${NC}"
    echo -e "${BOLD}${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo ""
    echo -e "${YELLOW}📌 Próximos passos:${NC}"
    echo ""
    echo -e "${CYAN}1️⃣  Configure suas API Keys:${NC}"
    echo -e "${DIM}   cd $INSTALL_DIR${NC}"
    echo -e "${DIM}   nano .env${NC}"
    echo -e "${DIM}   (Adicione pelo menos ANTHROPIC_API_KEY)${NC}"
    echo ""
    echo -e "${CYAN}2️⃣  Reinicie o Turion após configurar:${NC}"
    echo -e "${DIM}   docker-compose restart turion${NC}"
    echo ""
    echo -e "${CYAN}3️⃣  Veja o QR Code do WhatsApp:${NC}"
    echo -e "${DIM}   cd $INSTALL_DIR${NC}"
    echo -e "${DIM}   ./watch-qr-docker.sh${NC}"
    echo -e "${DIM}   ou: docker-compose logs -f turion${NC}"
    echo ""
    echo -e "${CYAN}4️⃣  Autentique-se como proprietário:${NC}"
    echo -e "${DIM}   Após conectar WhatsApp, envie: ${BOLD}${YELLOW}${OWNER_PASSWORD}${NC}${DIM}${NC}"
    echo -e "${DIM}   O Turion vai reconhecer você como dono!${NC}"
    echo ""
    echo -e "${CYAN}5️⃣  Comandos úteis Docker:${NC}"
    echo -e "${DIM}   docker-compose logs -f turion    ${NC}# Ver logs"
    echo -e "${DIM}   docker-compose restart turion    ${NC}# Reiniciar"
    echo -e "${DIM}   docker-compose down              ${NC}# Parar"
    echo -e "${DIM}   docker-compose up -d --build     ${NC}# Rebuild + restart"
    echo -e "${DIM}   docker ps                        ${NC}# Status"
    echo ""
    echo -e "${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}💡 O container reinicia automaticamente em caso de erro${NC}"
    echo -e "${YELLOW}💡 Após reiniciar o servidor, o Turion inicia sozinho${NC}"
    echo ""
    echo -e "${CYAN}📚 Documentação: ${DIM}https://github.com/LucasBolla94/turionai${NC}"
    echo -e "${CYAN}🐛 Reportar bugs: ${DIM}https://github.com/LucasBolla94/turionai/issues${NC}"
    echo ""
    echo -e "${GREEN}🚀 Bom trabalho com o Turion!${NC}"
    echo ""
}

# ===== MAIN =====
main() {
    print_header
    print_box "INSTALADOR DOCKER" "$CYAN"

    echo -e "${WHITE}Este script irá instalar o Turion usando Docker.${NC}"
    echo ""

    # Verificar se já existe instalação
    existing_installation=$(find_existing_installation)
    has_existing=$?

    if [ $has_existing -eq 0 ]; then
        echo -e "${YELLOW}📍 Instalação existente detectada em: ${CYAN}$existing_installation${NC}"
    else
        echo -e "${CYAN}📍 Nova instalação em: ${WHITE}${INSTALL_DIR}${NC}"
    fi

    echo ""

    # Se modo pipe E não tem instalação existente, continuar automaticamente
    if [ "$IS_PIPE_MODE" = true ] && [ $has_existing -ne 0 ]; then
        echo -e "${GREEN}▶ Modo automático: instalação iniciando...${NC}"
        echo ""
        sleep 2
    elif [ "$IS_PIPE_MODE" = false ] && [ $has_existing -ne 0 ]; then
        # Modo interativo sem instalação existente
        read -p "$(echo -e ${YELLOW}"Deseja continuar? (S/n): "${NC})" -n 1 -r
        echo ""

        if [[ $REPLY =~ ^[Nn]$ ]]; then
            print_info "Instalação cancelada"
            exit 0
        fi
    fi

    # Verificar dependências
    print_header
    print_box "VERIFICANDO DEPENDÊNCIAS" "$BLUE"

    if ! check_git; then
        print_warning "Git não encontrado"
        install_git
    fi

    if ! check_docker; then
        print_warning "Docker não encontrado"
        install_docker
    fi

    if ! check_docker_compose; then
        print_warning "Docker Compose não encontrado"
        install_docker_compose
    fi

    # Iniciar Docker
    sleep 1
    start_docker_service

    # Instalar Turion
    sleep 1
    install_turion
    preserve_env=$?  # Capturar se deve preservar .env

    # Executar configuração
    sleep 1
    run_setup $preserve_env

    # Iniciar containers
    sleep 1
    start_containers

    # Criar script de monitoramento
    sleep 1
    create_watch_script

    # Mensagem final
    sleep 1
    show_final_message
}

# Execute
main
