# Test script for Memory System (STEP-03)
# Usage: .\test-memory.ps1

Write-Host "🧪 Rodando teste do Memory System..." -ForegroundColor Cyan
Write-Host ""

npx tsx src/test-memory.ts

Write-Host ""
Write-Host "✅ Teste concluído!" -ForegroundColor Green
