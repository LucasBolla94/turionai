# Feature Flags Test script (STEP-07)
# Usage: .\test-feature-flags.ps1

Write-Host "🧪 Rodando teste de Feature Flags..." -ForegroundColor Cyan
Write-Host ""

npx tsx src/test-feature-flags.ts

Write-Host ""
Write-Host "✅ Teste concluído!" -ForegroundColor Green
Write-Host ""
