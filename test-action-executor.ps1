# Action Executor Test script (STEP-06)
# Usage: .\test-action-executor.ps1

Write-Host "🧪 Rodando teste de Action Executor..." -ForegroundColor Cyan
Write-Host ""

npx tsx src/test-action-executor.ts

Write-Host ""
Write-Host "✅ Teste concluído!" -ForegroundColor Green
Write-Host ""
