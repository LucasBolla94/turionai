# ============================================================================
#   ████████╗██╗   ██╗██████╗ ██╗ ██████╗ ███╗   ██╗
#   ╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗████╗  ██║
#      ██║   ██║   ██║██████╔╝██║██║   ██║██╔██╗ ██║
#      ██║   ██║   ██║██╔══██╗██║██║   ██║██║╚██╗██║
#      ██║   ╚██████╔╝██║  ██║██║╚██████╔╝██║ ╚████║
#      ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝
#
#   Instalador Automático - V1.1.1
#   Windows PowerShell
#
# ============================================================================

#Requires -Version 5.0

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

function Print-Info {
    param([string]$Message)
    Write-ColorOutput "ℹ $Message" "Cyan"
}

function Print-Success {
    param([string]$Message)
    Write-ColorOutput "✓ $Message" "Green"
}

function Print-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠ $Message" "Yellow"
}

function Print-Error {
    param([string]$Message)
    Write-ColorOutput "✗ $Message" "Red"
}

# ===== FUNÇÕES DE VERIFICAÇÃO =====
function Test-Docker {
    try {
        $version = docker --version 2>$null
        if ($version -and $LASTEXITCODE -eq 0) {
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

function Test-DockerCompose {
    try {
        $version = docker compose version 2>$null
        if ($version -and $LASTEXITCODE -eq 0) {
            return $true
        }
    } catch {
        return $false
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

# ===== DOWNLOAD DE INSTALADORES =====
function Get-Installer {
    param([string]$InstallerName)

    $TempFile = "$env:TEMP\$InstallerName"

    Write-ColorOutput "Baixando $InstallerName..." "DarkGray"

    try {
        $url = "https://raw.githubusercontent.com/LucasBolla94/turionai/main/scripts/$InstallerName"
        Invoke-WebRequest -Uri $url -OutFile $TempFile -UseBasicParsing -ErrorAction Stop
        return $TempFile
    } catch {
        Print-Error "Falha ao baixar $InstallerName"
        return $null
    }
}

# ===== INSTALAÇÃO DOCKER =====
function Install-DockerMethod {
    Print-Header
    Print-Box "INSTALANDO COM DOCKER" "Blue"

    Write-Host ""
    Print-Info "Baixando instalador Docker..."
    Write-Host ""

    $installerPath = Get-Installer "install-docker.ps1"

    if ($installerPath) {
        # Executar instalador Docker
        & PowerShell -ExecutionPolicy Bypass -File $installerPath
    } else {
        Print-Error "Não foi possível baixar o instalador Docker"
        Print-Info "Tente executar manualmente:"
        Print-Info "iwr -useb https://raw.githubusercontent.com/LucasBolla94/turionai/main/scripts/install-docker.ps1 | iex"
        exit 1
    }
}

# ===== INSTALAÇÃO PM2 =====
function Install-PM2Method {
    Print-Header
    Print-Box "INSTALANDO COM PM2" "Magenta"

    Write-Host ""
    Print-Info "Baixando instalador PM2..."
    Write-Host ""

    $installerPath = Get-Installer "install-pm2.ps1"

    if ($installerPath) {
        # Executar instalador PM2
        & PowerShell -ExecutionPolicy Bypass -File $installerPath
    } else {
        Print-Error "Não foi possível baixar o instalador PM2"
        Print-Info "Tente executar manualmente:"
        Print-Info "iwr -useb https://raw.githubusercontent.com/LucasBolla94/turionai/main/scripts/install-pm2.ps1 | iex"
        exit 1
    }
}

# ===== MENU DE ESCOLHA =====
function Show-InstallationMenu {
    param([bool]$DockerAvailable)

    Print-Header
    Print-Box "ESCOLHA O MÉTODO DE INSTALAÇÃO" "Cyan"

    Write-Host ""

    if ($DockerAvailable) {
        Write-ColorOutput "✓ Docker detectado no sistema" "Green"
    } else {
        Write-ColorOutput "⚠ Docker não encontrado" "Yellow"
    }

    Write-Host ""
    Write-ColorOutput "Escolha um método de instalação:" "White"
    Write-Host ""

    # Método 1: Docker (Recomendado)
    Write-ColorOutput "1) 🐳 Docker " -NoNewline
    Write-ColorOutput "(Recomendado - Mais Seguro)" "Green"
    Write-ColorOutput "   ✓ Isolamento completo do sistema" "DarkGray"
    Write-ColorOutput "   ✓ Sem conflitos de dependências" "DarkGray"
    Write-ColorOutput "   ✓ Fácil de atualizar e gerenciar" "DarkGray"
    Write-ColorOutput "   ✓ Ideal para produção" "DarkGray"
    if (-not $DockerAvailable) {
        Write-ColorOutput "   (Docker Desktop precisa ser instalado manualmente)" "Yellow"
    }
    Write-Host ""

    # Método 2: PM2 (Alternativa)
    Write-ColorOutput "2) ⚡ PM2 " -NoNewline
    Write-ColorOutput "(Alternativa Leve)" "Yellow"
    Write-ColorOutput "   ✓ Execução nativa no sistema" "DarkGray"
    Write-ColorOutput "   ✓ Sem overhead do Docker" "DarkGray"
    Write-ColorOutput "   ✓ Monitoramento integrado PM2" "DarkGray"
    Write-ColorOutput "   ✓ Acesso direto ao código" "DarkGray"
    Write-Host ""

    Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "DarkGray"
    Write-Host ""
}

# ===== MAIN =====
function Main {
    # Verificar se Docker está disponível
    $dockerAvailable = Test-Docker
    $dockerComposeAvailable = Test-DockerCompose

    # Detectar se está em modo não-interativo
    $isNonInteractive = $false
    try {
        $null = [Console]::KeyAvailable
    } catch {
        $isNonInteractive = $true
    }

    # MODO NÃO-INTERATIVO (iwr | iex) - Escolha automática
    if ($isNonInteractive -or $env:TURION_AUTO_INSTALL) {
        Print-Header
        Print-Box "MODO AUTOMÁTICO" "Cyan"

        Write-Host ""

        if ($dockerAvailable) {
            Print-Success "Docker detectado - usando instalação Docker automaticamente"
            Write-Host ""
            Print-Info "🐳 Docker é o método recomendado (mais seguro e isolado)"
            Write-Host ""
            Start-Sleep -Seconds 2
            Install-DockerMethod
        } else {
            Print-Warning "Docker não encontrado - usando instalação PM2 automaticamente"
            Write-Host ""
            Print-Info "💡 Dica: Para usar Docker, instale Docker Desktop primeiro"
            Write-Host ""
            Start-Sleep -Seconds 2
            Install-PM2Method
        }

        exit 0
    }

    # MODO INTERATIVO - Mostrar menu
    Show-InstallationMenu $dockerAvailable

    # Perguntar escolha
    $choice = Read-Host "Escolha uma opção (1/2)"
    Write-Host ""

    switch ($choice) {
        "1" {
            # Docker escolhido
            if (-not $dockerAvailable) {
                Write-ColorOutput "Docker Desktop não está instalado no sistema." "Yellow"
                Write-Host ""
                $response = Read-Host "Deseja continuar para instalar com Docker? (S/n)"
                Write-Host ""

                if ($response -match '^[Nn]$') {
                    Print-Info "Docker não será usado"
                    Write-Host ""
                    $response2 = Read-Host "Deseja usar PM2 como alternativa? (S/n)"
                    Write-Host ""

                    if ($response2 -match '^[Nn]$') {
                        Print-Info "Instalação cancelada"
                        Write-Host ""
                        Print-Info "Para instalar Docker Desktop manualmente:"
                        Print-Info "  https://www.docker.com/products/docker-desktop"
                        Write-Host ""
                        exit 0
                    } else {
                        Install-PM2Method
                        exit 0
                    }
                }
            }

            # Prosseguir com Docker
            Install-DockerMethod
        }

        "2" {
            # PM2 escolhido
            Install-PM2Method
        }

        default {
            Print-Error "Opção inválida"
            Write-Host ""
            Print-Info "Execute novamente e escolha 1 (Docker) ou 2 (PM2)"
            exit 1
        }
    }
}

# Execute
try {
    Main
} catch {
    Print-Error "Erro durante a instalação: $_"
    Write-Host $_.ScriptStackTrace
    exit 1
}
