#!/bin/bash
# Test Gateway - STEP-01
# Script para testar o MessageGateway

cd "$(dirname "$0")/.."

echo "🧪 Testando Message Gateway - STEP-01"
echo ""

# Rodar teste
npx tsx src/test-gateway.ts

echo ""
echo "✅ Teste concluído!"
