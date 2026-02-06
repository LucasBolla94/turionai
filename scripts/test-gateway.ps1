# Test Gateway - STEP-01 (Windows)
# Script para testar o MessageGateway

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "🧪 Testando Message Gateway - STEP-01" -ForegroundColor Cyan
Write-Host ""

# Rodar teste
npx tsx src/test-gateway.ts

Write-Host ""
Write-Host "✅ Teste concluído!" -ForegroundColor Green
