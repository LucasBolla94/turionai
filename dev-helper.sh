#!/bin/bash

# Turion V1.1.1 - Development Helper Script
# Facilita o workflow de desenvolvimento incremental

set -e

ROADMAP_FILE="roadmap-v1.1.1.md"
UPDATES_FILE="Updates.md"

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════╗"
echo "║   Turion V1.1.1 - Dev Helper          ║"
echo "║   Incremental Development Tool        ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Menu principal
show_menu() {
    echo ""
    echo -e "${GREEN}Escolha uma ação:${NC}"
    echo "1. 🚀 Iniciar novo STEP"
    echo "2. ✅ Concluir STEP atual"
    echo "3. 🧪 Testar STEP atual"
    echo "4. 📊 Ver progresso"
    echo "5. 📝 Ver próximos steps"
    echo "6. 🔄 Fazer rollback"
    echo "7. 🏃 Build e Deploy"
    echo "8. ❌ Sair"
    echo ""
    read -p "Digite o número (1-8): " choice
    echo ""
}

# Função: Iniciar novo step
start_step() {
    read -p "Número do STEP (ex: 01): " step_num
    read -p "Nome curto (ex: gateway): " step_name

    branch_name="feature/step-${step_num}-${step_name}"

    echo -e "${YELLOW}Criando branch: ${branch_name}${NC}"

    git checkout -b "$branch_name"

    echo ""
    echo -e "${GREEN}✅ Branch criada com sucesso!${NC}"
    echo ""
    echo "📝 Próximos passos:"
    echo "1. Abra o arquivo: ${ROADMAP_FILE}#step-${step_num}"
    echo "2. Implemente o código conforme especificado"
    echo "3. Execute: ./dev-helper.sh (opção 3 para testar)"
    echo "4. Execute: ./dev-helper.sh (opção 2 para concluir)"
    echo ""
}

# Função: Concluir step
complete_step() {
    current_branch=$(git rev-parse --abbrev-ref HEAD)

    if [[ ! $current_branch =~ ^feature/step-[0-9]+ ]]; then
        echo -e "${RED}❌ Você não está em uma branch de step!${NC}"
        echo "Branch atual: $current_branch"
        return
    fi

    echo -e "${YELLOW}Branch atual: ${current_branch}${NC}"
    echo ""

    # Extrair número do step
    step_num=$(echo $current_branch | grep -oP 'step-\K[0-9]+')

    read -p "Título do commit (ex: Message Gateway Base): " commit_title
    read -p "Descrição curta (opcional): " commit_desc

    echo ""
    echo -e "${YELLOW}📝 Atualizando ${UPDATES_FILE}...${NC}"

    # Lembrete para atualizar Updates.md
    echo ""
    echo -e "${RED}⚠️  IMPORTANTE:${NC}"
    echo "Antes de commitar, atualize o arquivo ${UPDATES_FILE}"
    echo "com as informações do STEP-${step_num}."
    echo ""
    read -p "Você atualizou o ${UPDATES_FILE}? (s/n): " updated

    if [[ $updated != "s" && $updated != "S" ]]; then
        echo -e "${RED}❌ Por favor, atualize ${UPDATES_FILE} antes de continuar.${NC}"
        return
    fi

    # Preparar commit
    echo ""
    echo -e "${YELLOW}Preparando commit...${NC}"

    git add .

    commit_message="feat(step-${step_num}): ${commit_title}"

    if [ ! -z "$commit_desc" ]; then
        commit_message="${commit_message}

${commit_desc}

Refs: roadmap-v1.1.1.md#step-${step_num}"
    else
        commit_message="${commit_message}

Refs: roadmap-v1.1.1.md#step-${step_num}"
    fi

    git commit -m "$commit_message"

    echo ""
    echo -e "${GREEN}✅ Commit criado com sucesso!${NC}"
    echo ""

    read -p "Fazer push agora? (s/n): " do_push

    if [[ $do_push == "s" || $do_push == "S" ]]; then
        git push origin "$current_branch"
        echo ""
        echo -e "${GREEN}✅ Push concluído!${NC}"
    fi

    echo ""
    read -p "Fazer merge para main? (s/n): " do_merge

    if [[ $do_merge == "s" || $do_merge == "S" ]]; then
        git checkout main
        git merge "$current_branch"
        git push origin main
        echo ""
        echo -e "${GREEN}✅ Merge para main concluído!${NC}"

        read -p "Deletar branch feature? (s/n): " delete_branch
        if [[ $delete_branch == "s" || $delete_branch == "S" ]]; then
            git branch -d "$current_branch"
            git push origin --delete "$current_branch"
            echo -e "${GREEN}✅ Branch deletada!${NC}"
        fi
    fi

    echo ""
    echo -e "${BLUE}🎉 STEP-${step_num} concluído!${NC}"
    echo ""
}

# Função: Testar step atual
test_step() {
    echo -e "${YELLOW}🧪 Executando testes...${NC}"
    echo ""

    # Verificar se há testes
    if [ -f "package.json" ]; then
        if grep -q '"test"' package.json; then
            npm test
        else
            echo -e "${YELLOW}⚠️  Nenhum script de teste definido em package.json${NC}"
        fi
    fi

    echo ""
    echo -e "${BLUE}Teste manual:${NC}"
    echo "1. Execute: npm run dev"
    echo "2. Envie mensagem pelo WhatsApp"
    echo "3. Verifique logs no console"
    echo ""

    read -p "Iniciar servidor de desenvolvimento? (s/n): " start_dev

    if [[ $start_dev == "s" || $start_dev == "S" ]]; then
        npm run dev
    fi
}

# Função: Ver progresso
show_progress() {
    echo -e "${BLUE}📊 Progresso V1.1.1${NC}"
    echo ""

    total_steps=28
    completed_steps=$(grep -c "✅" "$UPDATES_FILE" || echo "0")

    percentage=$((completed_steps * 100 / total_steps))

    echo "Steps concluídos: ${completed_steps}/${total_steps} (${percentage}%)"
    echo ""

    # Barra de progresso
    filled=$((percentage / 5))
    empty=$((20 - filled))

    echo -n "["
    for ((i=0; i<filled; i++)); do echo -n "█"; done
    for ((i=0; i<empty; i++)); do echo -n "░"; done
    echo "] ${percentage}%"

    echo ""
    echo -e "${GREEN}Últimos steps concluídos:${NC}"
    grep "^## \[STEP-" "$UPDATES_FILE" | head -5

    echo ""
}

# Função: Ver próximos steps
show_next_steps() {
    echo -e "${BLUE}📝 Próximos Steps${NC}"
    echo ""

    # Buscar steps pendentes no roadmap
    grep "^### STEP" "$ROADMAP_FILE" | head -5

    echo ""
    echo "Para mais detalhes, consulte: ${ROADMAP_FILE}"
    echo ""
}

# Função: Rollback
rollback() {
    current_branch=$(git rev-parse --abbrev-ref HEAD)

    echo -e "${RED}⚠️  ROLLBACK${NC}"
    echo ""
    echo "Branch atual: $current_branch"
    echo ""
    echo "Opções de rollback:"
    echo "1. Reverter último commit (preserva mudanças locais)"
    echo "2. Reverter último commit (descarta mudanças)"
    echo "3. Voltar para main (descarta branch)"
    echo "4. Cancelar"
    echo ""

    read -p "Escolha (1-4): " rollback_choice

    case $rollback_choice in
        1)
            git reset --soft HEAD~1
            echo -e "${GREEN}✅ Commit revertido (mudanças preservadas)${NC}"
            ;;
        2)
            git reset --hard HEAD~1
            echo -e "${GREEN}✅ Commit revertido (mudanças descartadas)${NC}"
            ;;
        3)
            read -p "Tem certeza? Isso descartará a branch atual. (s/n): " confirm
            if [[ $confirm == "s" || $confirm == "S" ]]; then
                git checkout main
                git branch -D "$current_branch"
                echo -e "${GREEN}✅ Voltou para main${NC}"
            fi
            ;;
        4)
            echo "Cancelado."
            ;;
        *)
            echo -e "${RED}Opção inválida${NC}"
            ;;
    esac

    echo ""
}

# Função: Build e Deploy
build_deploy() {
    echo -e "${YELLOW}🏗️  Building...${NC}"

    npm run build

    echo ""
    echo -e "${GREEN}✅ Build concluído!${NC}"
    echo ""

    read -p "Fazer deploy agora? (s/n): " do_deploy

    if [[ $do_deploy == "s" || $do_deploy == "S" ]]; then
        echo -e "${YELLOW}🚀 Deploying...${NC}"

        # Adaptar para seu sistema de deploy
        # Exemplos:
        # docker compose up -d --build
        # git push heroku main
        # npm run deploy

        echo ""
        echo -e "${GREEN}✅ Deploy concluído!${NC}"
    fi
}

# Loop principal
while true; do
    show_menu

    case $choice in
        1)
            start_step
            ;;
        2)
            complete_step
            ;;
        3)
            test_step
            ;;
        4)
            show_progress
            ;;
        5)
            show_next_steps
            ;;
        6)
            rollback
            ;;
        7)
            build_deploy
            ;;
        8)
            echo -e "${BLUE}Até logo! 👋${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Opção inválida!${NC}"
            ;;
    esac

    read -p "Pressione ENTER para continuar..."
done
