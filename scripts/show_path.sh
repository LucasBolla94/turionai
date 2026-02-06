#!/bin/bash
# Show project path
echo "📁 Caminho do projeto:"
pwd
echo ""
echo "📂 Diretório completo:"
realpath "$(dirname "$0")/.."
