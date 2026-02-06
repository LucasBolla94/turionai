# ============================================================================
#
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

#Requires -RunAsAdministrator

# Configurações
$ErrorActionPreference = "Stop"
$InstallDir = "$env:USERPROFILE\turion"
$RepoUrl = "https://github.com/LucasBolla94/turionai.git"
$NodeVersion = "18"

# ===== FUNÇÕES DE CORES =====
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Print-Header {
    Clear-Host
    Write-Host ""
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
    $Padding = [Math]::Max(0, [Math]::Floor(($Width - $Text.Length - 2) / 2))
    $Line = "═" * $Width

    Write-Host ""
    Write-ColorOutput "╔$Line╗" $Color
    Write-ColorOutput ("║" + (" " * $Padding) + $Text + (" " * ($Width - $Padding - $Text.Length)) + "║") $Color
    Write-ColorOutput "╚$Line╝" $Color
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

# ===== VERIFICAÇÕES =====
function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Test-NodeJs {
    if (Test-Command "node") {
        $Version = (node -v).Replace("v", "").Split(".")[0]
        if ([int]$Version -ge [int]$NodeVersion) {
            Print-Success "Node.js $(node -v) instalado"
            return $true
        } else {
            Print-Warning "Node.js $(node -v) é muito antigo (necessário >= v${NodeVersion})"
            return $false
        }
    }
    return $false
}

function Test-Git {
    if (Test-Command "git") {
        $Version = (git --version).Split(" ")[2]
        Print-Success "Git $Version instalado"
        return $true
    }
    return $false
}

function Test-PM2 {
    if (Test-Command "pm2") {
        Print-Success "PM2 instalado"
        return $true
    }
    return $false
}

# ===== INSTALAÇÃO =====
function Install-Chocolatey {
    Print-Step "Instalando Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    Print-Success "Chocolatey instalado!"
}

function Install-NodeJs {
    Print-Step "Instalando Node.js..."

    # Verificar se Chocolatey está instalado
    if (-not (Test-Command "choco")) {
        Install-Chocolatey
        # Refresh environment
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }

    choco install nodejs --version=$NodeVersion -y

    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    Print-Success "Node.js instalado!"
}

function Install-Git {
    Print-Step "Instalando Git..."

    if (-not (Test-Command "choco")) {
        Install-Chocolatey
    }

    choco install git -y

    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    Print-Success "Git instalado!"
}

function Install-PM2 {
    Print-Step "Instalando PM2..."
    npm install -g pm2
    npm install -g pm2-windows-startup
    Print-Success "PM2 instalado!"
}

# ===== INSTALAÇÃO DO TURION =====
function Install-Turion {
    Print-Header
    Print-Box "INSTALANDO TURION" "Magenta"

    # Verificar se já existe
    if (Test-Path $InstallDir) {
        Print-Warning "Turion já está instalado em $InstallDir"
        Write-Host ""
        $Response = Read-Host "Deseja reinstalar? (s/N)"

        if ($Response -notmatch '^[Ss]$') {
            Print-Info "Instalação cancelada"
            exit 0
        }

        Print-Step "Removendo instalação anterior..."
        Remove-Item -Path $InstallDir -Recurse -Force
    }

    # Criar diretório
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Set-Location $InstallDir

    # Baixar do GitHub
    Print-Step "Baixando Turion do GitHub..."

    $ZipUrl = "https://github.com/LucasBolla94/turionai/archive/refs/heads/main.zip"
    $ZipFile = "turion.zip"

    # Download usando WebClient (compatível com Windows 7+)
    $WebClient = New-Object System.Net.WebClient
    $WebClient.DownloadFile($ZipUrl, $ZipFile)

    Print-Step "Extraindo arquivos..."
    Expand-Archive -Path $ZipFile -DestinationPath "." -Force

    # Mover arquivos da pasta extraída para raiz
    $ExtractedFolder = Get-ChildItem -Directory | Where-Object { $_.Name -like "turionai-*" }
    Get-ChildItem -Path $ExtractedFolder.FullName | Move-Item -Destination "." -Force
    Remove-Item -Path $ExtractedFolder.FullName -Recurse -Force
    Remove-Item -Path $ZipFile -Force

    Print-Success "Turion baixado e extraído!"

    # Instalar dependências
    Print-Step "Instalando dependências Node.js..."
    npm install
    Print-Success "Dependências instaladas!"

    # Compilar TypeScript
    Print-Step "Compilando TypeScript..."
    npm run build
    Print-Success "Projeto compilado!"

    # Criar diretórios necessários
    Print-Step "Criando diretórios..."
    @("logs", "state", "auth_info") | ForEach-Object {
        if (-not (Test-Path $_)) {
            New-Item -ItemType Directory -Path $_ -Force | Out-Null
        }
    }
    Print-Success "Diretórios criados!"
}

# ===== CONFIGURAÇÃO =====
function Start-Setup {
    Print-Header
    Print-Box "CONFIGURAÇÃO AUTOMÁTICA" "Cyan"

    Write-Host ""
    Print-Step "Gerando senha de acesso do proprietário..."

    # Gerar senha de 8 números aleatória
    $OwnerPassword = Get-Random -Minimum 10000000 -Maximum 99999999

    Write-ColorOutput "✓ Senha gerada: $OwnerPassword" "Yellow"
    Write-Host ""

    Print-Step "Criando arquivo .env..."

    # Criar .env básico se não existir
    if (-not (Test-Path ".env")) {
        $EnvContent = @"
# ============================================
# Turion V1.1.1 - Environment Variables
# ============================================

# ===== SENHA DO PROPRIETÁRIO (IMPORTANTE!) =====
# Use esta senha para autenticar como dono no WhatsApp
TURION_OWNER_PASSWORD=$OwnerPassword

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
        $EnvContent | Out-File -FilePath ".env" -Encoding UTF8
        Print-Success "Arquivo .env criado!"
    } else {
        # Adicionar senha ao .env existente se não tiver
        $EnvContent = Get-Content ".env" -Raw
        if ($EnvContent -notmatch "TURION_OWNER_PASSWORD") {
            "`n# Senha do proprietário`nTURION_OWNER_PASSWORD=$OwnerPassword" | Add-Content ".env"
            Print-Success "Senha adicionada ao .env existente!"
        } else {
            Print-Info ".env já existe e já tem senha configurada"
        }
    }

    Write-Host ""
    Print-Warning "⚠️  IMPORTANTE: Configure suas API Keys no .env!"
    Print-Info "   Edite o arquivo: notepad $InstallDir\.env"
    Print-Info "   Adicione pelo menos ANTHROPIC_API_KEY"
    Write-Host ""
    Start-Sleep -Seconds 3
}

# ===== PM2 CONFIGURATION =====
function Configure-PM2 {
    Print-Header
    Print-Box "CONFIGURANDO PM2" "Blue"

    Set-Location $InstallDir

    # Iniciar com PM2
    Print-Step "Iniciando Turion com PM2..."
    pm2 start ecosystem.config.js
    Print-Success "Turion iniciado!"

    # Salvar configuração
    Print-Step "Salvando configuração do PM2..."
    pm2 save
    Print-Success "Configuração salva!"

    # Configurar startup (Windows)
    Print-Step "Configurando auto-start no Windows..."
    try {
        pm2-startup install
        Print-Success "Auto-start configurado!"
    } catch {
        Print-Warning "Erro ao configurar auto-start. Execute manualmente:"
        Print-Info "  pm2-startup install"
    }
}

# ===== CRIAR SCRIPT DE MONITORAMENTO =====
function New-WatchScript {
    Print-Step "Criando script de monitoramento de QR Code..."

    $WatchScriptContent = @'
@echo off
cls
echo ╔════════════════════════════════════════════════════════════╗
echo ║          MONITOR DE QR CODE - TURION V1.1.1               ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Monitorando logs do PM2...
echo Quando o QR Code aparecer, escaneie com seu WhatsApp
echo.
echo Pressione Ctrl+C para sair
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

pm2 logs turion --raw --lines 100
'@

    $WatchScriptContent | Out-File -FilePath "watch-qr.bat" -Encoding ASCII
    Print-Success "Script watch-qr.bat criado!"
}

# ===== FINALIZAÇÃO =====
function Show-FinalMessage {
    Print-Header
    Print-Box "INSTALAÇÃO CONCLUÍDA! 🎉" "Green"

    # Ler senha do .env
    $OwnerPassword = (Get-Content ".env" | Select-String "TURION_OWNER_PASSWORD").ToString().Split("=")[1]

    Write-ColorOutput "✅ Turion foi instalado e iniciado com sucesso!" "White"
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║              SENHA DO PROPRIETÁRIO                        ║" -ForegroundColor Yellow
    Write-Host "║                                                            ║" -ForegroundColor Yellow
    Write-Host "║              $OwnerPassword                                  ║" -ForegroundColor White
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
    Write-ColorOutput "   pm2 restart turion" "DarkGray"
    Write-Host ""
    Write-ColorOutput "3️⃣  Veja o QR Code do WhatsApp:" "Cyan"
    Write-ColorOutput "   cd $InstallDir" "DarkGray"
    Write-ColorOutput "   .\watch-qr.bat" "DarkGray"
    Write-Host ""
    Write-ColorOutput "4️⃣  Autentique-se como proprietário:" "Cyan"
    Write-ColorOutput "   Após conectar WhatsApp, envie: $OwnerPassword" "Yellow"
    Write-ColorOutput "   O Turion vai reconhecer você como dono!" "DarkGray"
    Write-Host ""
    Write-ColorOutput "5️⃣  Comandos úteis:" "Cyan"
    Write-ColorOutput "   pm2 logs turion      # Ver logs" "DarkGray"
    Write-ColorOutput "   pm2 restart turion   # Reiniciar" "DarkGray"
    Write-ColorOutput "   pm2 monit            # Monitorar recursos" "DarkGray"
    Write-Host ""
    Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "DarkGray"
    Write-Host ""
    Write-ColorOutput "💡 O Turion reinicia automaticamente em caso de erro" "Yellow"
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
    Print-Box "INSTALADOR AUTOMÁTICO" "Cyan"

    Write-ColorOutput "Este script irá instalar e configurar o Turion automaticamente." "White"
    Write-Host ""
    Write-ColorOutput "Será instalado em: $InstallDir" "DarkGray"
    Write-Host ""

    # Detectar se está sendo executado via pipe (iwr | iex)
    # Se KeyAvailable não existir ou gerar erro, assume modo não-interativo
    try {
        $IsInteractive = [Console]::KeyAvailable -or $true
        if ($IsInteractive -and -not $env:TURION_AUTO_INSTALL) {
            $Response = Read-Host "Deseja continuar? (S/n)"

            if ($Response -match '^[Nn]$') {
                Print-Info "Instalação cancelada"
                exit 0
            }
        } else {
            Write-ColorOutput "▶ Modo automático detectado. Continuando instalação..." "Green"
            Write-Host ""
            Start-Sleep -Seconds 2
        }
    } catch {
        # Modo não-interativo
        Write-ColorOutput "▶ Modo automático detectado. Continuando instalação..." "Green"
        Write-Host ""
        Start-Sleep -Seconds 2
    }

    # Verificar dependências
    Print-Header
    Print-Box "VERIFICANDO DEPENDÊNCIAS" "Blue"

    if (-not (Test-NodeJs)) {
        Print-Warning "Node.js não encontrado ou versão antiga"
        Install-NodeJs
    }

    if (-not (Test-Git)) {
        Print-Warning "Git não encontrado"
        Install-Git
    }

    if (-not (Test-PM2)) {
        Print-Warning "PM2 não encontrado"
        Install-PM2
    }

    # Instalar Turion
    Start-Sleep -Seconds 1
    Install-Turion

    # Executar wizard de configuração
    Start-Sleep -Seconds 1
    Start-Setup

    # Configurar PM2
    Start-Sleep -Seconds 1
    Configure-PM2

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
    Print-Info "Tente executar novamente ou reporte o erro em:"
    Print-Info "https://github.com/LucasBolla94/turionai/issues"
    exit 1
}
