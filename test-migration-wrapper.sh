#!/bin/bash
# Migration Wrapper Test script (STEP-05)
# Usage: ./test-migration-wrapper.sh [v2]

MODE=${1:-legacy}

echo "🧪 Rodando teste de Migration Wrapper..."
echo ""

if [ "$MODE" == "v2" ]; then
    echo "Modo: Brain V2 (novo sistema) 🚀"
    export TURION_USE_BRAIN_V2=true
else
    echo "Modo: Legacy (sistema antigo)"
    export TURION_USE_BRAIN_V2=false
fi

echo ""

npx tsx src/test-migration-wrapper.ts

echo ""
echo "✅ Teste concluído!"
echo ""
echo "Para testar Brain V2, rode: ./test-migration-wrapper.sh v2"
echo ""
