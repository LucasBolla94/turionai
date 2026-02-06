# Integration Test script (STEP-04)
# Usage: .\test-integration.ps1

Write-Host "🧪 Rodando teste de integração..." -ForegroundColor Cyan
Write-Host ""

npx tsx src/test-integration.ts

Write-Host ""
Write-Host "✅ Teste concluído!" -ForegroundColor Green
