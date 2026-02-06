# Test script for Brain Orchestrator (STEP-02)
# Usage: .\test-orchestrator.ps1

Write-Host "🧪 Rodando teste do Brain Orchestrator..." -ForegroundColor Cyan
Write-Host ""

npx tsx src/test-orchestrator.ts

Write-Host ""
Write-Host "✅ Teste concluído!" -ForegroundColor Green
