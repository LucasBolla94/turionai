#!/bin/bash
# Integration Test script (STEP-04)
# Usage: ./test-integration.sh

echo "🧪 Rodando teste de integração..."
echo ""

npx tsx src/test-integration.ts

echo ""
echo "✅ Teste concluído!"
