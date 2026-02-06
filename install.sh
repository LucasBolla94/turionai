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
#   Instalador Automático - V1.1.1
#   Linux / macOS
#
###############################################################################

set -e  # Exit on error

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

# ===== VARIÁVEIS =====
INSTALL_DIR="$HOME/turion"
REPO_URL="https://github.com/LucasBolla94/turionai.git"
NODE_VERSION="18"
PM2_VERSION="latest"

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

# ===== VERIFICAÇÕES =====
check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

check_node() {
    if check_command node; then
        local version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$version" -ge "$NODE_VERSION" ]; then
            print_success "Node.js v$(node -v) instalado"
            return 0
        else
            print_warning "Node.js v$(node -v) é muito antigo (necessário >= v${NODE_VERSION})"
            return 1
        fi
    else
        return 1
    fi
}

check_git() {
    if check_command git; then
        print_success "Git $(git --version | cut -d' ' -f3) instalado"
        return 0
    else
        return 1
    fi
}

check_pm2() {
    if check_command pm2; then
        print_success "PM2 instalado"
        return 0
    else
        return 1
    fi
}

# ===== INSTALAÇÃO =====
install_node() {
    print_step "Instalando Node.js..."

    # Detectar sistema operacional
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if check_command apt-get; then
            # Debian/Ubuntu
            curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif check_command yum; then
            # CentOS/RHEL
            curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | sudo bash -
            sudo yum install -y nodejs
        else
            print_error "Gerenciador de pacotes não suportado. Instale Node.js manualmente."
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if check_command brew; then
            brew install node@${NODE_VERSION}
        else
            print_error "Homebrew não encontrado. Instale em: https://brew.sh"
            exit 1
        fi
    else
        print_error "Sistema operacional não suportado"
        exit 1
    fi

    print_success "Node.js instalado!"
}

install_git() {
    print_step "Instalando Git..."

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if check_command apt-get; then
            sudo apt-get update
            sudo apt-get install -y git
        elif check_command yum; then
            sudo yum install -y git
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if check_command brew; then
            brew install git
        else
            xcode-select --install
        fi
    fi

    print_success "Git instalado!"
}

install_pm2() {
    print_step "Instalando PM2..."
    npm install -g pm2@${PM2_VERSION}
    print_success "PM2 instalado!"
}

# ===== INSTALAÇÃO DO TURION =====
install_turion() {
    print_header
    print_box "INSTALANDO TURION" "$MAGENTA"

    # Verificar se já existe
    if [ -d "$INSTALL_DIR" ]; then
        print_warning "Turion já está instalado em $INSTALL_DIR"
        echo ""
        read -p "$(echo -e ${YELLOW}"Deseja reinstalar? (s/N): "${NC})" -n 1 -r
        echo ""

        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            print_info "Instalação cancelada"
            exit 0
        fi

        print_step "Removendo instalação anterior..."
        rm -rf "$INSTALL_DIR"
    fi

    # Criar diretório
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"

    # Baixar e extrair do GitHub
    print_step "Baixando Turion do GitHub..."

    # Download do arquivo ZIP da branch main
    curl -L -o turion.tar.gz "https://github.com/LucasBolla94/turionai/archive/refs/heads/main.tar.gz"

    print_step "Extraindo arquivos..."
    tar -xzf turion.tar.gz --strip-components=1
    rm turion.tar.gz

    print_success "Turion baixado e extraído!"

    # Instalar dependências
    print_step "Instalando dependências Node.js..."
    npm install --production=false
    print_success "Dependências instaladas!"

    # Compilar TypeScript
    print_step "Compilando TypeScript..."
    npm run build
    print_success "Projeto compilado!"

    # Criar diretórios necessários
    print_step "Criando diretórios..."
    mkdir -p logs state auth_info
    print_success "Diretórios criados!"
}

# ===== CONFIGURAÇÃO =====
run_setup() {
    print_header
    print_box "CONFIGURAÇÃO AUTOMÁTICA" "$CYAN"

    echo ""
    print_step "Gerando senha de acesso do proprietário..."

    # Gerar senha de 8 números aleatória
    OWNER_PASSWORD=$(shuf -i 10000000-99999999 -n 1 2>/dev/null || echo $((10000000 + RANDOM * RANDOM % 90000000)))

    print_success "Senha gerada: ${BOLD}${YELLOW}${OWNER_PASSWORD}${NC}"
    echo ""

    print_step "Criando arquivo .env..."

    # Criar .env básico se não existir
    if [ ! -f .env ]; then
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
    else
        # Adicionar senha ao .env existente se não tiver
        if ! grep -q "TURION_OWNER_PASSWORD" .env; then
            echo "" >> .env
            echo "# Senha do proprietário" >> .env
            echo "TURION_OWNER_PASSWORD=${OWNER_PASSWORD}" >> .env
            print_success "Senha adicionada ao .env existente!"
        else
            print_info ".env já existe e já tem senha configurada"
        fi
    fi

    echo ""
    print_warning "⚠️  IMPORTANTE: Configure suas API Keys no .env!"
    print_info "   Edite o arquivo: nano $INSTALL_DIR/.env"
    print_info "   Adicione pelo menos ANTHROPIC_API_KEY"
    echo ""
    sleep 3
}

# ===== PM2 CONFIGURATION =====
configure_pm2() {
    print_header
    print_box "CONFIGURANDO PM2" "$BLUE"

    cd "$INSTALL_DIR"

    # Iniciar com PM2
    print_step "Iniciando Turion com PM2..."
    pm2 start ecosystem.config.js
    print_success "Turion iniciado!"

    # Salvar configuração
    print_step "Salvando configuração do PM2..."
    pm2 save
    print_success "Configuração salva!"

    # Configurar startup
    print_step "Configurando auto-start..."
    echo ""
    print_warning "Execute o comando abaixo para ativar auto-start:"
    echo ""

    # Detectar init system
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        pm2 startup systemd -u $(whoami) --hp $HOME
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        pm2 startup launchd -u $(whoami) --hp $HOME
    fi

    echo ""
    read -p "$(echo -e ${YELLOW}"Pressione ENTER após executar o comando acima..."${NC})"

    print_success "Auto-start configurado!"
}

# ===== CRIAR SCRIPT DE MONITORAMENTO =====
create_watch_script() {
    print_step "Criando script de monitoramento de QR Code..."

    cat > watch-qr.sh << 'EOFSCRIPT'
#!/bin/bash

# Script para monitorar QR Code do WhatsApp em tempo real
# Turion V1.1.1

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          MONITOR DE QR CODE - TURION V1.1.1               ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Monitorando logs do PM2...${NC}"
echo -e "${YELLOW}Quando o QR Code aparecer, escaneie com seu WhatsApp${NC}"
echo ""
echo -e "${GREEN}Pressione Ctrl+C para sair${NC}"
echo ""
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Seguir logs do PM2 e filtrar para mostrar QR Codes
pm2 logs turion --raw --lines 0 | grep --line-buffered -A 30 "QR"
EOFSCRIPT

    chmod +x watch-qr.sh
    print_success "Script watch-qr.sh criado!"
}

# ===== FINALIZAÇÃO =====
show_final_message() {
    print_header
    print_box "INSTALAÇÃO CONCLUÍDA! 🎉" "$GREEN"

    # Ler senha do .env
    OWNER_PASSWORD=$(grep TURION_OWNER_PASSWORD .env | cut -d'=' -f2)

    echo -e "${WHITE}✅ Turion foi instalado e iniciado com sucesso!${NC}"
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
    echo -e "${DIM}   pm2 restart turion${NC}"
    echo ""
    echo -e "${CYAN}3️⃣  Veja o QR Code do WhatsApp:${NC}"
    echo -e "${DIM}   cd $INSTALL_DIR${NC}"
    echo -e "${DIM}   ./watch-qr.sh${NC}"
    echo ""
    echo -e "${CYAN}4️⃣  Autentique-se como proprietário:${NC}"
    echo -e "${DIM}   Após conectar WhatsApp, envie: ${BOLD}${YELLOW}${OWNER_PASSWORD}${NC}${DIM}${NC}"
    echo -e "${DIM}   O Turion vai reconhecer você como dono!${NC}"
    echo ""
    echo -e "${CYAN}5️⃣  Comandos úteis:${NC}"
    echo -e "${DIM}   pm2 logs turion      ${NC}# Ver logs"
    echo -e "${DIM}   pm2 restart turion   ${NC}# Reiniciar"
    echo -e "${DIM}   pm2 monit            ${NC}# Monitorar recursos"
    echo ""
    echo -e "${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}💡 O Turion reinicia automaticamente em caso de erro${NC}"
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
    print_box "INSTALADOR AUTOMÁTICO" "$CYAN"

    echo -e "${WHITE}Este script irá instalar e configurar o Turion automaticamente.${NC}"
    echo ""
    echo -e "${DIM}Será instalado em: ${INSTALL_DIR}${NC}"
    echo ""

    # Detectar se está sendo executado via pipe (curl | bash)
    # Se stdin não é um terminal, pula confirmação
    if [ -t 0 ]; then
        # É um terminal interativo
        read -p "$(echo -e ${YELLOW}"Deseja continuar? (S/n): "${NC})" -n 1 -r
        echo ""

        if [[ $REPLY =~ ^[Nn]$ ]]; then
            print_info "Instalação cancelada"
            exit 0
        fi
    else
        # Executando via pipe, continua automaticamente
        echo -e "${GREEN}▶ Modo automático detectado. Continuando instalação...${NC}"
        echo ""
        sleep 2
    fi

    # Verificar dependências
    print_header
    print_box "VERIFICANDO DEPENDÊNCIAS" "$BLUE"

    if ! check_node; then
        print_warning "Node.js não encontrado ou versão antiga"
        install_node
    fi

    if ! check_git; then
        print_warning "Git não encontrado"
        install_git
    fi

    if ! check_pm2; then
        print_warning "PM2 não encontrado"
        install_pm2
    fi

    # Instalar Turion
    sleep 1
    install_turion

    # Executar wizard de configuração
    sleep 1
    run_setup

    # Configurar PM2
    sleep 1
    configure_pm2

    # Criar script de monitoramento
    sleep 1
    create_watch_script

    # Mensagem final
    sleep 1
    show_final_message
}

# Execute
main
