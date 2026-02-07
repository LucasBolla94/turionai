# ============================================================================
#   ████████╗██╗   ██╗██████╗ ██╗ ██████╗ ███╗   ██╗
#   ╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗████╗  ██║
#      ██║   ██║   ██║██████╔╝██║██║   ██║██╔██╗ ██║
#      ██║   ██║   ██║██╔══██╗██║██║   ██║██║╚██╗██║
#      ██║   ╚██████╔╝██║  ██║██║╚██████╔╝██║ ╚████║
#      ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝
#
#   Instalador Docker - V1.1.1
#   Windows PowerShell
#
# ============================================================================

# Requer PowerShell 5.0+
#Requires -Version 5.0

# ===== CONFIGURAÇÕES =====
$InstallDir = if ($env:TURION_INSTALL_DIR) { $env:TURION_INSTALL_DIR } else { "$env:USERPROFILE\turion" }
$RepoUrl = "https://github.com/LucasBolla94/turionai.git"

# ===== FUNÇÕES DE PRINT =====
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Print-Header {
    Clear-Host
    Write-ColorOutput "████████╗██╗   ██╗██████╗ ██╗ ██████╗ ███╗   ██╗" "Cyan"
    Write-ColorOutput "╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗████╗  ██║" "Cyan"
    Write-ColorOutput "   ██║   ██║   ██║██████╔╝██║██║   ██║██╔██╗ ██║" "Cyan"
    Write-ColorOutput "   ██║   ██║   ██║██╔══██╗██║██║   ██║██║╚██╗██║" "Cyan"
    Write-ColorOutput "   ██║   ╚██████╔╝██║  ██║██║╚██████╔╝██║ ╚████║" "Cyan"
    Write-ColorOutput "   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝" "Cyan"
    Write-Host ""
    Write-ColorOutput "        🤖 Assistente Pessoal via WhatsApp" "White"
    Write-ColorOutput "           Versão 1.1.1 - Brain System V2" "DarkGray"
    Write-ColorOutput "              🐳 Instalação Docker" "DarkGray"
    Write-Host ""
}

function Print-Box {
    param(
        [string]$Text,
        [string]$Color = "Green"
    )
    $Width = 60
    $Padding = [Math]::Floor(($Width - $Text.Length - 2) / 2)

    Write-Host ""
    Write-ColorOutput "╔$('=' * $Width)╗" $Color
    Write-ColorOutput "║$(' ' * $Padding)$Text$(' ' * ($Width - $Padding - $Text.Length))║" $Color
    Write-ColorOutput "╚$('=' * $Width)╝" $Color
    Write-Host ""
}

function Print-Step {
    param([string]$Message)
    Write-ColorOutput "▶ $Message" "Blue"
}

function Print-Success {
    param([string]$Message)
    Write-ColorOutput "✓ $Message" "Green"
}

function Print-Error {
    param([string]$Message)
    Write-ColorOutput "✗ $Message" "Red"
}

function Print-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠ $Message" "Yellow"
}

function Print-Info {
    param([string]$Message)
    Write-ColorOutput "ℹ $Message" "Cyan"
}

# ===== FUNÇÕES DE VERIFICAÇÃO =====
function Test-Command {
    param([string]$Command)
    try {
        if (Get-Command $Command -ErrorAction Stop) {
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

function Test-Docker {
    if (Test-Command docker) {
        try {
            $version = docker --version 2>$null
            if ($version) {
                $versionNumber = ($version -split ' ')[2] -replace ',',''
                Print-Success "Docker $versionNumber instalado"
                return $true
            }
        } catch {}
    }
    return $false
}

function Test-DockerCompose {
    try {
        $version = docker compose version 2>$null
        if ($version) {
            $versionNumber = ($version -split ' ')[-1]
            Print-Success "Docker Compose $versionNumber instalado"
            return $true
        }
    } catch {}
    return $false
}

function Test-Git {
    if (Test-Command git) {
        try {
            $version = git --version 2>$null
            if ($version) {
                $versionNumber = ($version -split ' ')[2]
                Print-Success "Git $versionNumber instalado"
                return $true
            }
        } catch {}
    }
    return $false
}

function Test-DockerDesktop {
    # Verificar se Docker Desktop está instalado
    $dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"

    if (Test-Path $dockerDesktopPath) {
        return $true
    }

    # Verificar no registro
    $registryPath = "HKLM:\SOFTWARE\Docker Inc.\Docker"
    if (Test-Path $registryPath) {
        return $true
    }

    return $false
}

function Test-DockerRunning {
    try {
        $null = docker ps 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

# ===== INSTALAÇÃO =====
function Install-Git {
    Print-Step "Instalando Git via Winget..."

    try {
        winget install --id Git.Git -e --silent --accept-source-agreements --accept-package-agreements

        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

        Print-Success "Git instalado!"
        return $true
    } catch {
        Print-Warning "Não foi possível instalar Git via Winget"
        Print-Info "Por favor, instale Git manualmente: https://git-scm.com/download/win"
        return $false
    }
}

function Install-DockerDesktop {
    Print-Header
    Print-Box "DOCKER DESKTOP NECESSÁRIO" "Yellow"

    Write-Host ""
    Write-ColorOutput "Docker Desktop não está instalado no seu sistema." "Yellow"
    Write-Host ""
    Write-ColorOutput "Para instalar o Turion com Docker, você precisa do Docker Desktop." "White"
    Write-Host ""
    Write-ColorOutput "📥 Como instalar Docker Desktop:" "Cyan"
    Write-Host ""
    Write-ColorOutput "1️⃣  Acesse: https://www.docker.com/products/docker-desktop" "White"
    Write-ColorOutput "2️⃣  Baixe o Docker Desktop para Windows" "White"
    Write-ColorOutput "3️⃣  Execute o instalador e siga as instruções" "White"
    Write-ColorOutput "4️⃣  Reinicie o computador se solicitado" "White"
    Write-ColorOutput "5️⃣  Abra o Docker Desktop e aguarde iniciar" "White"
    Write-Host ""
    Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "DarkGray"
    Write-Host ""

    $response = Read-Host "Você já instalou o Docker Desktop e deseja continuar? (S/n)"

    if ($response -match '^[Nn]$') {
        Print-Info "Instalação cancelada"
        Write-Host ""
        Write-ColorOutput "💡 Dica: Se preferir não usar Docker, você pode instalar com PM2:" "Yellow"
        Write-ColorOutput "   iwr -useb https://raw.githubusercontent.com/LucasBolla94/turionai/main/scripts/install-pm2.ps1 | iex" "DarkGray"
        Write-Host ""
        exit 0
    }

    # Verificar novamente se Docker está disponível
    Print-Step "Verificando Docker Desktop..."
    Start-Sleep -Seconds 2

    if (-not (Test-DockerDesktop)) {
        Print-Error "Docker Desktop ainda não foi detectado"
        Print-Warning "Por favor, instale o Docker Desktop e execute este script novamente"
        exit 1
    }

    # Aguardar Docker iniciar
    Print-Step "Aguardando Docker iniciar..."
    $maxWait = 60  # 60 segundos
    $waited = 0

    while (-not (Test-DockerRunning) -and $waited -lt $maxWait) {
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 2
        $waited += 2
    }
    Write-Host ""

    if (Test-DockerRunning) {
        Print-Success "Docker está rodando!"
    } else {
        Print-Warning "Docker não está respondendo. Por favor, abra o Docker Desktop manualmente."
        $null = Read-Host "Pressione ENTER quando o Docker estiver rodando"
    }
}

# ===== DETECÇÃO DE INSTALAÇÃO EXISTENTE =====
function Find-ExistingInstallation {
    $possibleLocations = @(
        $InstallDir,
        "$env:USERPROFILE\turionai",
        "C:\turion",
        "C:\turionai"
    )

    foreach ($location in $possibleLocations) {
        if ((Test-Path $location) -and (Test-Path "$location\docker-compose.yml")) {
            return $location
        }
    }

    return $null
}

function Handle-ExistingInstallation {
    param([string]$ExistingDir)

    Print-Header
    Print-Box "INSTALAÇÃO EXISTENTE DETECTADA" "Yellow"

    Write-Host ""
    Write-ColorOutput "Turion já está instalado em: " "White" -NoNewline
    Write-ColorOutput $ExistingDir "Cyan"
    Write-Host ""
    Write-ColorOutput "O que você deseja fazer?" "Yellow"
    Write-Host ""
    Write-ColorOutput "1) Atualizar preservando configurações (.env)" "Cyan"
    Write-ColorOutput "2) Reinstalar limpando tudo (nova senha será gerada)" "Cyan"
    Write-ColorOutput "3) Cancelar instalação" "Cyan"
    Write-Host ""

    $choice = Read-Host "Escolha uma opção (1/2/3)"
    Write-Host ""

    switch ($choice) {
        "1" {
            Print-Step "Atualização com preservação de configurações selecionada"
            $script:InstallDir = $ExistingDir
            return 1  # Preservar .env
        }
        "2" {
            Print-Step "Reinstalação limpa selecionada"
            # Fazer backup do .env
            if (Test-Path "$ExistingDir\.env") {
                Print-Step "Fazendo backup de .env antigo..."
                $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
                Copy-Item "$ExistingDir\.env" "$ExistingDir\.env.backup.$timestamp"
                Print-Success "Backup criado!"
            }
            $script:InstallDir = $ExistingDir
            return 0  # Reset
        }
        default {
            Print-Info "Instalação cancelada"
            exit 0
        }
    }
}

# ===== INSTALAÇÃO DO TURION =====
function Install-Turion {
    $preserveEnv = $false

    # Verificar se já existe instalação
    $existingInstallation = Find-ExistingInstallation

    if ($existingInstallation) {
        $preserveEnv = Handle-ExistingInstallation $existingInstallation

        # Parar containers se estiverem rodando
        Print-Step "Parando containers se estiverem rodando..."
        Set-Location $InstallDir

        try {
            docker-compose down 2>$null
        } catch {}

        try {
            docker compose down 2>$null
        } catch {}

        Print-Success "Containers parados!"

        # Preservar .env se necessário
        if ($preserveEnv -eq 1 -and (Test-Path "$InstallDir\.env")) {
            Print-Step "Preservando configurações..."
            Copy-Item "$InstallDir\.env" "$env:TEMP\turion_env_backup"
        }
    } else {
        Print-Header
        Print-Box "INSTALANDO TURION" "Magenta"
    }

    # Criar/limpar diretório
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Set-Location $InstallDir

    # Baixar do GitHub
    Print-Step "Baixando Turion do GitHub..."

    if (Test-Path ".git") {
        # Se já é um repositório, fazer pull
        git pull --quiet origin main
    } else {
        # Limpar diretório e clonar
        Remove-Item -Path "$InstallDir\*" -Recurse -Force -ErrorAction SilentlyContinue
        git clone --quiet $RepoUrl temp_clone
        Move-Item -Path "temp_clone\*" -Destination "." -Force
        Remove-Item -Path "temp_clone" -Recurse -Force
    }

    Print-Success "Turion baixado!"

    # Restaurar .env se foi preservado
    if ($preserveEnv -eq 1 -and (Test-Path "$env:TEMP\turion_env_backup")) {
        Print-Step "Restaurando configurações preservadas..."
        Copy-Item "$env:TEMP\turion_env_backup" "$InstallDir\.env"
        Remove-Item "$env:TEMP\turion_env_backup"
        Print-Success "Configurações restauradas!"
    }

    # Criar diretórios necessários
    Print-Step "Criando diretórios..."
    New-Item -ItemType Directory -Path "logs" -Force | Out-Null
    New-Item -ItemType Directory -Path "state" -Force | Out-Null
    New-Item -ItemType Directory -Path "auth_info" -Force | Out-Null
    Print-Success "Diretórios criados!"

    return $preserveEnv
}

# ===== CONFIGURAÇÃO =====
function Start-Setup {
    param([int]$PreserveEnv)

    Print-Header
    Print-Box "CONFIGURAÇÃO AUTOMÁTICA" "Cyan"

    Write-Host ""

    # Se .env já existe e foi preservado, não recriar
    if ($PreserveEnv -eq 1 -and (Test-Path ".env")) {
        Print-Success "Configurações preservadas do .env existente!"
        Write-Host ""

        # Ler senha existente
        $existingEnv = Get-Content ".env" -Raw
        if ($existingEnv -match 'TURION_OWNER_PASSWORD=([^\r\n]+)') {
            $ownerPassword = $matches[1]
            Print-Info "Senha do proprietário (existente): $ownerPassword"
        } else {
            Print-Warning "Senha do proprietário não encontrada no .env"
        }

        Write-Host ""
        Start-Sleep -Seconds 2
        return
    }

    # Gerar nova senha
    Print-Step "Gerando senha de acesso do proprietário..."

    # Gerar senha de 8 números aleatória
    $ownerPassword = Get-Random -Minimum 10000000 -Maximum 99999999

    Write-ColorOutput "✓ Senha gerada: " "Green" -NoNewline
    Write-ColorOutput $ownerPassword "Yellow"
    Write-Host ""

    Print-Step "Criando arquivo .env..."

    # Criar .env completo
    $envContent = @"
# ============================================
# Turion V1.1.1 - Environment Variables
# ============================================

# ===== SENHA DO PROPRIETÁRIO (IMPORTANTE!) =====
# Use esta senha para autenticar como dono no WhatsApp
TURION_OWNER_PASSWORD=$ownerPassword

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
"@

    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Print-Success "Arquivo .env criado!"

    Write-Host ""
    Print-Warning "⚠️  IMPORTANTE: Configure suas API Keys no .env!"
    Print-Info "   Edite o arquivo: notepad $InstallDir\.env"
    Print-Info "   Adicione pelo menos ANTHROPIC_API_KEY"
    Write-Host ""
    Start-Sleep -Seconds 3
}

# ===== DOCKER COMPOSE =====
function Start-Containers {
    Print-Header
    Print-Box "INICIANDO CONTAINERS" "Blue"

    Set-Location $InstallDir

    Print-Step "Parando containers antigos..."
    try { docker-compose down 2>$null } catch {}
    try { docker compose down 2>$null } catch {}

    Print-Step "Removendo sessão WhatsApp antiga (QR Code novo será gerado)..."
    Remove-Item -Path "state\baileys" -Recurse -Force -ErrorAction SilentlyContinue

    Print-Step "Iniciando containers com Docker Compose..."

    # Tentar diferentes comandos
    $success = $false

    try {
        docker compose up -d --force-recreate 2>$null
        if ($LASTEXITCODE -eq 0) {
            Print-Success "Containers iniciados com docker compose!"
            $success = $true
        }
    } catch {}

    if (-not $success) {
        try {
            docker-compose up -d --force-recreate 2>$null
            if ($LASTEXITCODE -eq 0) {
                Print-Success "Containers iniciados com docker-compose (legacy)!"
                $success = $true
            }
        } catch {}
    }

    if (-not $success) {
        Print-Error "Falha ao iniciar containers"
        Print-Info "Tentando com logs verbose..."
        docker compose up -d --force-recreate
    }

    Start-Sleep -Seconds 3

    # Verificar se container está rodando
    $running = docker ps --format "{{.Names}}" | Select-String -Pattern "turion"
    if ($running) {
        Print-Success "Container Turion está rodando!"
    } else {
        Print-Warning "Não foi possível verificar status do container"
    }
}

# ===== CRIAR SCRIPT DE MONITORAMENTO =====
function New-WatchScript {
    Print-Step "Criando script de monitoramento de QR Code..."

    $watchScriptContent = @'
# Script para monitorar QR Code do WhatsApp em tempo real
# Turion V1.1.1 - Docker

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       MONITOR DE QR CODE - TURION V1.1.1 (DOCKER)        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Monitorando logs do Docker..." -ForegroundColor Yellow
Write-Host "Quando o QR Code aparecer, escaneie com seu WhatsApp" -ForegroundColor Yellow
Write-Host ""
Write-Host "Pressione Ctrl+C para sair" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# Seguir logs do Docker
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    docker-compose logs -f turion
} elseif (Get-Command docker -ErrorAction SilentlyContinue) {
    docker logs -f turion
} else {
    Write-Host "Docker não encontrado!" -ForegroundColor Red
    exit 1
}
'@

    $watchScriptContent | Out-File -FilePath "watch-qr-docker.ps1" -Encoding UTF8
    Print-Success "Script watch-qr-docker.ps1 criado!"
}

# ===== FINALIZAÇÃO =====
function Show-FinalMessage {
    Print-Header
    Print-Box "INSTALAÇÃO CONCLUÍDA! 🎉" "Green"

    # Ler senha do .env
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match 'TURION_OWNER_PASSWORD=([^\r\n]+)') {
        $ownerPassword = $matches[1]
    } else {
        $ownerPassword = "NÃO ENCONTRADA"
    }

    Write-ColorOutput "✅ Turion foi instalado e iniciado com Docker!" "White"
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║              SENHA DO PROPRIETÁRIO                        ║" -ForegroundColor Yellow
    Write-Host "║                                                            ║" -ForegroundColor Yellow
    Write-Host "║              $ownerPassword                                  ║" -ForegroundColor White
    Write-Host "║                                                            ║" -ForegroundColor Yellow
    Write-Host "║  ⚠️  Guarde esta senha! Você vai usar no WhatsApp          ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    Write-Host ""
    Write-ColorOutput "📌 Próximos passos:" "Yellow"
    Write-Host ""
    Write-ColorOutput "1️⃣  Configure suas API Keys:" "Cyan"
    Write-ColorOutput "   cd $InstallDir" "DarkGray"
    Write-ColorOutput "   notepad .env" "DarkGray"
    Write-ColorOutput "   (Adicione pelo menos ANTHROPIC_API_KEY)" "DarkGray"
    Write-Host ""
    Write-ColorOutput "2️⃣  Reinicie o Turion após configurar:" "Cyan"
    Write-ColorOutput "   docker-compose restart turion" "DarkGray"
    Write-Host ""
    Write-ColorOutput "3️⃣  Veja o QR Code do WhatsApp:" "Cyan"
    Write-ColorOutput "   cd $InstallDir" "DarkGray"
    Write-ColorOutput "   .\watch-qr-docker.ps1" "DarkGray"
    Write-ColorOutput "   ou: docker-compose logs -f turion" "DarkGray"
    Write-Host ""
    Write-ColorOutput "4️⃣  Autentique-se como proprietário:" "Cyan"
    Write-ColorOutput "   Após conectar WhatsApp, envie: $ownerPassword" "Yellow"
    Write-ColorOutput "   O Turion vai reconhecer você como dono!" "DarkGray"
    Write-Host ""
    Write-ColorOutput "5️⃣  Comandos úteis Docker:" "Cyan"
    Write-ColorOutput "   docker-compose logs -f turion    # Ver logs" "DarkGray"
    Write-ColorOutput "   docker-compose restart turion    # Reiniciar" "DarkGray"
    Write-ColorOutput "   docker-compose down              # Parar" "DarkGray"
    Write-ColorOutput "   docker-compose up -d --build     # Rebuild + restart" "DarkGray"
    Write-ColorOutput "   docker ps                        # Status" "DarkGray"
    Write-Host ""
    Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "DarkGray"
    Write-Host ""
    Write-ColorOutput "💡 O container reinicia automaticamente em caso de erro" "Yellow"
    Write-ColorOutput "💡 Após reiniciar o servidor, o Turion inicia sozinho" "Yellow"
    Write-Host ""
    Write-ColorOutput "📚 Documentação: https://github.com/LucasBolla94/turionai" "Cyan"
    Write-ColorOutput "🐛 Reportar bugs: https://github.com/LucasBolla94/turionai/issues" "Cyan"
    Write-Host ""
    Write-ColorOutput "🚀 Bom trabalho com o Turion!" "Green"
    Write-Host ""
}

# ===== MAIN =====
function Main {
    Print-Header
    Print-Box "INSTALADOR DOCKER" "Cyan"

    Write-ColorOutput "Este script irá instalar o Turion usando Docker." "White"
    Write-Host ""

    # Verificar se já existe instalação
    $existingInstallation = Find-ExistingInstallation

    if ($existingInstallation) {
        Write-ColorOutput "📍 Instalação existente detectada em: " "Yellow" -NoNewline
        Write-ColorOutput $existingInstallation "Cyan"
    } else {
        Write-ColorOutput "📍 Nova instalação em: " "Cyan" -NoNewline
        Write-ColorOutput $InstallDir "White"
    }

    Write-Host ""

    if (-not $existingInstallation) {
        $response = Read-Host "Deseja continuar? (S/n)"

        if ($response -match '^[Nn]$') {
            Print-Info "Instalação cancelada"
            exit 0
        }
    }

    # Verificar dependências
    Print-Header
    Print-Box "VERIFICANDO DEPENDÊNCIAS" "Blue"

    if (-not (Test-Git)) {
        Print-Warning "Git não encontrado"
        if (-not (Install-Git)) {
            Print-Error "Não foi possível instalar Git"
            exit 1
        }
    }

    if (-not (Test-DockerDesktop)) {
        Print-Warning "Docker Desktop não encontrado"
        Install-DockerDesktop
    }

    if (-not (Test-Docker)) {
        Print-Error "Docker não está disponível"
        Print-Info "Por favor, inicie o Docker Desktop e execute este script novamente"
        exit 1
    }

    if (-not (Test-DockerCompose)) {
        Print-Warning "Docker Compose não disponível (geralmente vem com Docker Desktop)"
    }

    # Instalar Turion
    Start-Sleep -Seconds 1
    $preserveEnv = Install-Turion

    # Executar configuração
    Start-Sleep -Seconds 1
    Start-Setup $preserveEnv

    # Iniciar containers
    Start-Sleep -Seconds 1
    Start-Containers

    # Criar script de monitoramento
    Start-Sleep -Seconds 1
    New-WatchScript

    # Mensagem final
    Start-Sleep -Seconds 1
    Show-FinalMessage
}

# Execute
try {
    Main
} catch {
    Print-Error "Erro durante a instalação: $_"
    Write-Host $_.ScriptStackTrace
    exit 1
}
