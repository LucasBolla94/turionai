# Roadmap – Projeto Turion (Assistente Pessoal estilo OpenClaw)

> Objetivo do roadmap:
> Construir o Turion em camadas, sempre **funcionando de verdade**, testável a cada etapa,
> evitando complexidade precoce e permitindo evolução segura e escalável.

---

## FASE 0 — Preparação mental e princípios (ANTES DE CODAR)

### Objetivos
- Ter regras claras para não virar bagunça
- Evitar decisões perigosas cedo demais
- Garantir que tudo seja testável passo a passo

### Decisões fixas
- Linguagem principal: **Node.js**
- Execução 24/7: **Docker (com restart automático)** ou **PM2**
- Canal inicial: **WhatsApp (Baileys)**
- Segurança: **usuário dedicado + scripts permitidos**
- Arquitetura: **Cérebro (IA) separado do Executor**

### Resultado esperado
- Documento de visão (já feito)
- Roadmap definido (este documento)
- Nenhuma linha de código ainda

---

## FASE 1 — Estrutura base do projeto (fundação) ✅

### Objetivo
Criar a estrutura do projeto sem funcionalidades, apenas para:
- subir
- rodar
- reiniciar
- logar

### Passos
1. Criar repositório Git (ex: `turion-core`)
2. Criar estrutura inicial de pastas:
turion/
├─ src/
│ ├─ core/
│ ├─ channels/
│ ├─ skills/
│ ├─ executor/
│ ├─ security/
│ ├─ config/
│ └─ utils/
├─ scripts/
├─ logs/
├─ state/
├─ docker-compose.yml
├─ package.json
└─ README.md

3. Criar um `index.ts` que:
- sobe o processo
- escreve “Turion iniciado”
- fica rodando (event loop vivo)

4. Criar Docker Compose mínimo:
- container Node
- restart automático
- volume para `state/` e `logs/`

### Testes
- Subir com `docker compose up -d`
- Derrubar container → verificar se sobe sozinho
- Ver logs com `docker logs`

### Resultado esperado
✅ Turion sobe, não faz nada, mas **não morre**

---

## FASE 2 — Canal WhatsApp (conexão e estabilidade) ✅

### Objetivo
Conectar no WhatsApp e **provar que mensagens chegam no servidor**.

### Passos
1. Integrar biblioteca **Baileys**
2. Gerar QR Code no terminal/log
3. Escanear com WhatsApp
4. Salvar sessão em `state/`
5. Reconectar automaticamente ao reiniciar

### Funcionalidades mínimas
- Logar:
- conectado
- desconectado
- reconectando
- Receber mensagens (printar no log)

### Testes
- Mandar “oi” no WhatsApp
- Ver mensagem chegar no log
- Reiniciar container → NÃO pedir QR de novo
- Derrubar internet → reconectar

### Resultado esperado
✅ WhatsApp conectado 24/7  
✅ Mensagens chegam sempre

---

## FASE 3 — Filtro de segurança (quem pode falar com o Turion) ✅

### Objetivo
Garantir que **só números autorizados** possam interagir.

### Passos
1. Criar allowlist de números (config ou DB)
2. Ignorar mensagens de números não autorizados
3. Logar tentativas bloqueadas
4. Responder opcionalmente: “Acesso não autorizado”

### Testes
- Mandar mensagem de número autorizado → aceita
- Mandar de outro número → bloqueia

### Resultado esperado
✅ Segurança mínima garantida

---

## FASE 4 — Pipeline de mensagens (entender antes de agir) ✅

### Objetivo
Criar um fluxo claro:
**mensagem → intenção → ação (futura)**

### Passos
1. Criar módulo `MessagePipeline`
2. Separar:
- texto bruto
- remetente
- timestamp
3. Classificar mensagens simples:
- comando
- conversa
- desconhecido

### Exemplo
- “status” → intenção STATUS
- “oi” → intenção CHAT
- “deploy projeto” → intenção DEPLOY (ainda não executa)

### Testes
- Logar intenção detectada
- Nenhuma ação perigosa ainda

### Resultado esperado
✅ Turion entende *o que* foi pedido (em nível básico)

---

## FASE 5 — Executor SEGURO (sem poder destrutivo) ✅

### Objetivo
Criar a base que executa comandos **sem risco**.

### Passos
1. Criar usuário Linux dedicado (ex: `turion`)
2. Criar pasta `/opt/turion/scripts`
3. Criar scripts simples:
- `ping.sh`
- `whoami.sh`
4. Configurar sudoers:
- permitir apenas `/opt/turion/scripts/*`

5. Criar módulo `Executor` que:
- chama scripts
- captura stdout/stderr
- retorna resultado

### Testes
- Enviar “ping”
- Script roda
- Retorna resultado no WhatsApp

### Resultado esperado
✅ Turion executa coisas **sem risco**

---

## FASE 6 — Primeiros comandos reais (botões)

### Objetivo
Ter comandos úteis, simples e seguros.

### Comandos iniciais
- `status` → mostra uptime, container, memória
- `list scripts` → lista botões disponíveis
- `run <script>` → executa script permitido

### Testes
- Rodar cada comando
- Ver resposta clara no WhatsApp

### Resultado esperado
✅ Turion já “trabalha” de verdade

---

## FASE 7 — CRON Jobs (tarefas automáticas)

### Objetivo
Permitir tarefas agendadas.

### Passos
1. Escolher abordagem inicial:
- `node-cron` (interno)
2. Criar `CronManager`
3. Criar comandos:
- criar cron
- listar crons
- pausar cron
- remover cron
4. Persistir crons (arquivo ou DB)

### Testes
- Criar cron de teste (log a cada 1 min)
- Ver execução real
- Pausar e remover

### Resultado esperado
✅ Turion executa tarefas sozinho no tempo certo

---

## FASE 8 — Deploy simples de projetos (MVP)

### Objetivo
Primeiro deploy REAL, sem complexidade.

### Escopo inicial
- Apenas Docker Compose
- Projetos locais ou GitHub público

### Passos
1. Script `deploy_compose.sh`
2. Clonar repo
3. Rodar `docker compose up -d`
4. Ver status do container
5. Retornar resultado no WhatsApp

### Testes
- Deploy de projeto simples
- Atualizar e redeploy
- Ver logs

### Resultado esperado
✅ Turion faz deploy de verdade

---

## FASE 9 — Logs e diagnóstico básico

### Objetivo
Ajudar a entender erros.

### Passos
1. Criar comando `logs <projeto>`
2. Buscar logs Docker / PM2
3. Limitar tamanho de retorno
4. Mostrar erro claro

### Testes
- Quebrar projeto de propósito
- Ver erro pelo WhatsApp

### Resultado esperado
✅ Turion ajuda a debugar

---

## FASE 10 — Estrutura de Skills (organização)

### Objetivo
Preparar o projeto para crescer sem virar caos.

### Passos
1. Cada funcionalidade vira uma Skill:
- DeploySkill
- CronSkill
- LogsSkill
2. Interface padrão:
- canHandle()
- execute()
3. Registro automático de skills

### Resultado esperado
✅ Código organizado e escalável

---

## FASE 11 — Auditoria e histórico

### Objetivo
Saber tudo o que aconteceu.

### Passos
1. Criar AuditLog
2. Registrar:
- quem pediu
- o que foi feito
- quando
- resultado
3. Persistir (DB ou arquivo)

### Resultado esperado
✅ Histórico completo e confiável

---

## FASE 12 — Refinamento (SÓ AGORA)

### Exemplos de melhorias
- Botões interativos
- Confirmações (“tem certeza?”)
- IA para sugerir soluções
- Domínios + SSL
- Child agents
- Dashboard web
- Instalador `.sh`

---

## PRINCÍPIO FINAL

> **Nada novo entra sem passar por:**
> funcionar → ser testado → ser seguro → ser auditável

Este roadmap permite:
- parar em qualquer fase
- testar em produção real
- adaptar para múltiplos servidores
- crescer sem refatoração pesada

---

## Espaço reservado para adaptações futuras
- [ ] Multi-usuário
- [ ] Multi-servidor
- [ ] Multi-canal (Telegram, Slack)
- [ ] Plugin system
- [ ] Marketplace de skills
