# Migration Wrapper Test script (STEP-05)
# Usage: .\test-migration-wrapper.ps1 [v2]

param(
    [string]$mode = "legacy"
)

Write-Host "🧪 Rodando teste de Migration Wrapper..." -ForegroundColor Cyan
Write-Host ""

if ($mode -eq "v2") {
    Write-Host "Modo: Brain V2 (novo sistema) 🚀" -ForegroundColor Green
    $env:TURION_USE_BRAIN_V2 = "true"
} else {
    Write-Host "Modo: Legacy (sistema antigo)" -ForegroundColor Yellow
    $env:TURION_USE_BRAIN_V2 = "false"
}

Write-Host ""

npx tsx src/test-migration-wrapper.ts

Write-Host ""
Write-Host "✅ Teste concluído!" -ForegroundColor Green
Write-Host ""
Write-Host "Para testar Brain V2, rode: .\test-migration-wrapper.ps1 v2" -ForegroundColor Cyan
Write-Host ""
