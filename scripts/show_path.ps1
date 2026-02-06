# Show project path (Windows)
Write-Host "📁 Caminho do projeto:" -ForegroundColor Cyan
$pwd.Path
Write-Host ""
Write-Host "📂 Diretório completo:" -ForegroundColor Cyan
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ProjectRoot
