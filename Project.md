# Projeto Turion.md
## Assistente Pessoal Turion (cópia conceitual do OpenClaw)

> **Resumo em 1 linha:**  
> O **Turion** é um agente pessoal rodando 24/7 em um servidor Linux que recebe comandos (WhatsApp ou terminal/SSH), entende intenções, executa tarefas automatizadas (deploy, criação de arquivos, criação/gestão de crons, configurações de domínio/SSL, diagnóstico de erros) e registra tudo com segurança e auditoria.

---

## 1) Objetivo do projeto

Criar um sistema estilo **OpenClaw**, mas com foco em:

- **Controlar o servidor via WhatsApp** (QR Code) e também via **TUI** (terminal/SSH).
- Executar tarefas de DevOps e automação:
  - **Deploy automático** de projetos (Docker/Docker Compose ou PM2)
  - **Conectar com GitHub** (clonar, atualizar, buildar, subir)
  - **Criar/editar arquivos** e configurações
  - **Criar e gerenciar CRON jobs** (tarefas agendadas)
  - Ler logs, detectar erro e sugerir correções com IA
- Ter um “cérebro” (IA) para interpretar pedidos e um “executor” seguro para rodar ações no Linux.
- Ser claro e fácil de manter: arquitetura modular, logs, histórico, e políticas de permissão.

---

## 2) Visão geral (como funciona na prática)

### 2.1. O que o usuário faz
O usuário envia mensagens como:
- “Faz deploy do projeto X”
- “Cria um cron para rodar backup todo dia às 03:00”
- “Cria um arquivo .env com essas variáveis”
- “Configura o domínio api.meudominio.com com SSL”
- “Mostra os logs do container e tenta resolver o erro”

### 2.2. O que o Turion faz
O Turion segue um fluxo fixo:

1. **Recebe a mensagem** (WhatsApp ou TUI)
2. **Entende a intenção** (ex.: deploy, cron, logs, arquivo)
3. **Checa permissões** (quem pediu e se pode executar)
4. **Planeja a ação** (passos claros)
5. **Executa com segurança** (somente ações permitidas)
6. **Registra tudo** (log + auditoria)
7. **Responde** com resultado, link, status, logs ou erro e sugestão de correção

---

## 3) Canais de controle (WhatsApp e Terminal)

### 3.1. WhatsApp via QR Code
O Turion conecta no WhatsApp via biblioteca gratuita:

- **Baileys** (Node.js) — a opção mais comum e bem usada para WhatsApp Web.

**O que acontece:**
- Primeira vez: Turion mostra um QR Code → usuário escaneia → sessão é salva.
- Depois: Turion recarrega a sessão salva e reconecta automaticamente.
- Se cair: tenta reconectar.
- Se a sessão for invalidada: pede QR novamente.

**Ponto crucial:** o “estado” (credenciais da sessão) deve ser salvo em disco persistente, para não perder conexão após restart.

### 3.2. TUI (Terminal/SSH)
O Turion também pode rodar em modo “painel terminal” para comandos rápidos:
- Um menu interativo ou linha de comando estilo:
  - `turion deploy projetoX`
  - `turion cron list`
  - `turion logs nginx`

Bibliotecas úteis:
- **commander** (CLI)
- **inquirer** (menu interativo)
- **blessed** ou **ink** (TUI mais avançada)

---

## 4) O coração do sistema: “Cérebro” vs “Executor”

### 4.1. Cérebro (IA)
A IA interpreta a mensagem e retorna:
- intenção (o que o usuário quer)
- parâmetros (qual projeto, qual domínio, qual horário)
- plano em passos
- se existe risco ou dúvidas

A IA pode ser “pluggable” (troca fácil):
- Grok, OpenAI, Anthropic, modelos locais, etc.

### 4.2. Executor (parte que realmente roda comandos)
Essa parte executa ações no servidor.  
Ela NUNCA deve executar qualquer coisa livremente só porque “a IA quis”.

**Regra de ouro:**
- IA decide **o que** fazer
- Executor decide **se pode** fazer e **como** fazer com segurança

---

## 5) Segurança: como o Turion executa comandos “de admin” sem destruir o servidor

### 5.1. Problema
Se o Turion rodar como “root” ou tiver sudo total, qualquer comando errado pode:
- apagar arquivos do sistema
- vazar segredos
- derrubar serviços

### 5.2. Solução recomendada (modelo seguro)
**Modelo “funcionário + botões” (whitelist):**

- Criar um usuário Linux dedicado, por exemplo: `turion`
- O Turion roda como esse usuário (sem poder total).
- Para ações administrativas, o Turion **não executa comandos livres**.
- Em vez disso, o Turion chama **scripts aprovados** (botões) que ficam numa pasta, por exemplo:
  - `/opt/turion/scripts/`

Exemplos de scripts:
- `deploy_docker_compose.sh`
- `setup_nginx_domain.sh`
- `issue_ssl_certbot.sh`
- `restart_service.sh`
- `create_cron_job.sh`

No `sudoers`, permitir SOMENTE esses scripts, sem senha:
- `turion ALL=(ALL) NOPASSWD: /opt/turion/scripts/*`

**Resultado:**
- Mesmo se alguém tentar manipular a IA, ela só consegue “apertar botões” permitidos.

---

## 6) Funcionalidades principais (com exemplos e bibliotecas)

### 6.1. Deploy de projetos (GitHub → build → produção)

**O que significa “fazer deploy”:**
1) pegar código (GitHub)
2) instalar dependências
3) buildar
4) subir o serviço
5) colocar domínio/SSL (se necessário)
6) checar logs

**Bibliotecas/ferramentas gratuitas:**
- GitHub:
  - **simple-git** (executar git via Node)
  - ou **Octokit** (API do GitHub)
- Subir app:
  - **Docker / Docker Compose**
  - ou **PM2** (para apps Node)
- Proxy/domínio:
  - **Nginx**
- SSL:
  - **Certbot** (Let’s Encrypt)

**Exemplos de comando por WhatsApp:**
- “Faz deploy do repo `meuuser/projetoX` em `api.turion.network`”
- “Atualiza o projeto X (git pull e redeploy)”
- “Mostra o status do deploy e logs”

---

### 6.2. Criação e gerenciamento de CRON Jobs (tarefas agendadas)

**O que é cron:**
É uma tarefa que roda sozinha em horários definidos.
Ex.: todo dia 03:00 fazer backup.

**Duas formas de implementar:**

#### A) Cron do sistema (Linux crontab) — mais “raiz” e confiável
- Turion cria entradas no crontab do usuário ou do sistema.
- Bom para tarefas simples e robustas.

#### B) Cron interno do app — mais flexível e com painel
- Turion mantém um scheduler dentro do Node.
- Bom para ter “dashboard”, logs por tarefa, retries e controle.

**Bibliotecas gratuitas (Node):**
- **node-cron** (simples e popular)
- **bree** (scheduler robusto)
- **bullmq** + Redis (fila, retries, jobs pesados)

**Exemplos de comando:**
- “Cria um cron backup todos os dias às 03:00”
- “Lista meus crons”
- “Pausa o cron X”
- “Edita o cron X para rodar às 04:30”
- “Apaga o cron X”

---

### 6.3. Monitoramento de logs e auto-diagnóstico

**Objetivo:**
- Turion lê logs de serviços e detecta erros comuns.
- Pode sugerir correção ou aplicar correções automáticas (se permitido).

**Fontes de logs:**
- Docker: `docker logs`
- PM2: `pm2 logs`
- systemd: `journalctl`
- arquivos: `/var/log/nginx/error.log`, etc.

**Bibliotecas úteis:**
- Execução de comandos: Node `child_process`
- Parsing: regex / JSON logs
- Alertas: enviar mensagem no WhatsApp

**Exemplos:**
- “Mostra os logs do projeto X”
- “Por que o projeto X caiu?”
- “Tenta resolver o erro do Nginx e reinicia”

---

### 6.4. Criar/editar arquivos e configs no servidor

**O que faz:**
- criar arquivos (`.env`, configs)
- editar arquivos (com backup)
- criar pastas e estrutura
- versionar mudanças (opcional)

**Bibliotecas úteis:**
- Node `fs/promises` (criação e edição de arquivos)
- **yaml** (para docker-compose.yml ou configs yaml)
- **dotenv** (gerenciar variáveis)
- **zod** (validar inputs)

**Exemplos:**
- “Cria um arquivo `/opt/projetoX/.env` com essas variáveis”
- “Edita o nginx.conf do domínio X”
- “Faz backup antes de editar e me manda diff”

---

### 6.5. Nginx + Domínios + SSL (produção de verdade)

**O que o Turion faz:**
- criar “site config” no Nginx
- apontar domínio para um serviço (porta/container)
- ativar config
- emitir SSL com Certbot
- testar e reiniciar Nginx

**Ferramentas:**
- **Nginx**
- **Certbot** (Let’s Encrypt)
- scripts de validação (`nginx -t`)

**Exemplos:**
- “Configura `api.turion.network` para porta 3000 e ativa SSL”
- “Troca o domínio do projeto X para `app.turion.network`”
- “Renova certificados SSL”

---

### 6.6. Conexão com GitHub e automações

**Objetivo:**
- Turion “lembra” repos e projetos
- faz pull quando solicitado
- pode criar webhooks (opcional)
- pode abrir issues/PRs (opcional)

**Bibliotecas:**
- **Octokit** (GitHub API)
- **simple-git** (git no disco)

**Exemplos:**
- “Conecta o repo `bolla/projetoY` e salva como ProjetoY”
- “Faz deploy sempre que tiver commit novo na branch main” (isso pode virar um cron ou webhook)

---

## 7) “Memória” e histórico (para economizar tempo e manter consistência)

O Turion precisa lembrar:
- quais projetos existem
- onde foram deployados
- quais portas e domínios
- quais crons estão ativos
- histórico de erros e soluções
- preferências do dono (você)

**Banco recomendado:**
- **PostgreSQL**

**Bibliotecas Node:**
- **pg** ou **postgres**
- **Prisma** (ORM)

**Tabelas sugeridas:**
- `projects` (repo, pasta, modo deploy, domínio, portas)
- `deployments` (quando, status, logs resumidos)
- `cron_jobs` (schedule, comando/script, status)
- `audit_logs` (quem pediu, o que executou, resultado)
- `secrets` (idealmente usar vault/criptografia)

---

## 8) “Skills” (habilidades) — o sistema modular

O Turion deve ser construído por módulos (skills), por exemplo:
- Skill Deploy
- Skill Cron Manager
- Skill Nginx/SSL
- Skill Logs/Monitor
- Skill File Manager
- Skill GitHub

Cada skill deve ter:
- entrada (intenção + parâmetros)
- validação
- execução segura (scripts aprovados)
- resposta formatada
- registro em auditoria

---

## 9) Child Agents (agentes filhos com limites)

Ideia:
- Turion central cria “agentes menores” com permissões menores.
- Ex.: um agente só para “monitorar logs” (não faz deploy).
- Outro agente só para “bater backup”.
- Outro agente só para “build e testes”.

Cada agente filho:
- tem seu próprio token/config
- tem lista de comandos permitidos
- opera em pastas específicas

---

## 10) Exemplos completos de fluxos (bem real)

### 10.1. Fluxo: “Faz deploy do projeto do GitHub”
Usuário (WhatsApp):
> “Faz deploy do `bolla/meuapp` em `app.turion.network` usando Docker”

Turion:
1) Entende: deploy docker + domínio
2) Checa se usuário é autorizado
3) Clona repo em `/opt/meuapp`
4) Builda e sobe com `docker compose up -d`
5) Configura Nginx `app.turion.network` → porta do container
6) Emite SSL
7) Faz healthcheck (curl)
8) Responde:
   - “Deploy OK”
   - “URL”
   - “status do container”
   - “logs finais”

---

### 10.2. Fluxo: “Cria um cron”
Usuário:
> “Cria um cron para rodar backup todo dia 03:00”

Turion:
1) Cria `backup.sh` (ou usa existente)
2) Registra cron em `cron_jobs`
3) Ativa cron (crontab ou scheduler)
4) Responde:
   - “Cron criado: backup_daily_0300”
   - “Próxima execução: amanhã 03:00”
   - “Como pausar/editar”

---

### 10.3. Fluxo: “Diagnostica erro”
Usuário:
> “Meu site caiu, vê o que houve”

Turion:
1) Identifica projeto e modo deploy
2) Lê logs (docker/pm2/nginx)
3) Encontra erro (porta, env, build, 502, etc.)
4) Sugere fix com passos
5) Se permitido, aplica fix e reinicia
6) Responde com relatório simples

---

## 11) Deploy do próprio Turion (rodar 24/7)

### Opção recomendada: Docker Compose
- `restart: unless-stopped`
- volumes persistentes:
  - `state do WhatsApp`
  - `banco de dados` (se rodar local)
  - `workspace` de projetos e logs

Ou PM2 no host, caso prefira simplicidade.

---

## 12) Requisitos mínimos (mvp)

- Linux Ubuntu
- Node.js LTS
- Docker + Docker Compose
- Nginx + Certbot
- PostgreSQL
- WhatsApp via Baileys
- Um número autorizado (allowlist)
- Auditoria e logs obrigatórios

---

## 13) Riscos e cuidados (obrigatórios)

- **NUNCA** dar “sudo total” para o agente.
- Sempre usar:
  - whitelist de scripts
  - validação de parâmetros
  - logs e auditoria
- Proteger segredos:
  - `.env` fora do git
  - permissões de arquivo
  - ideal usar criptografia ou vault
- Definir limites:
  - tempo máximo por comando
  - tamanho máximo de logs enviados
  - bloqueio de comandos destrutivos

---

## 14) Roadmap sugerido (passo a passo)

### Fase 1 — MVP (funciona e é seguro)
1) WhatsApp QR + receber/enviar mensagens
2) Allowlist de usuários autorizados
3) Skill Deploy (docker compose)
4) Skill Logs (docker logs, nginx logs)
5) Skill Cron (listar/criar/pausar)
6) Auditoria em PostgreSQL

### Fase 2 — Produção forte
1) Domínios + SSL automáticos
2) Healthchecks + monitoramento
3) Sugestões com IA para erros
4) Child agents com permissões

### Fase 3 — Produto/empresa
1) Painel web (dashboard)
2) Multi-servidor (mini-agents)
3) Template de deploy por tipo (Next.js, Node API, Python API)
4) Políticas avançadas por cliente/equipe

---

## 15) Bibliotecas / Ferramentas gratuitas sugeridas (lista rápida)

**WhatsApp**
- Baileys (Node)

**CLI/TUI**
- commander, inquirer, blessed/ink

**Scheduler**
- node-cron (simples)
- bree (robusto)
- bullmq + Redis (fila e retries)

**GitHub**
- simple-git
- Octokit

**Deploy**
- Docker / Docker Compose
- PM2 (apps Node)

**Proxy/SSL**
- Nginx
- Certbot (Let’s Encrypt)

**Banco**
- PostgreSQL
- Prisma (opcional)

**Validação**
- zod

**Logs**
- pino / winston (opcional)

---

## 16) Conclusão

O **Turion** é um “assistente pessoal DevOps” estilo OpenClaw:
- conversa via WhatsApp/Terminal
- automatiza deploys, crons, arquivos e diagnósticos
- mantém histórico e auditoria
- e é seguro por design (whitelist de comandos)

A base do projeto é:
- **IA para entender**
- **scripts permitidos para executar**
- **logs + auditoria para confiar**

---

**Nome do projeto:** Assistente Pessoal Turion  
**Missão:** Controlar e automatizar infraestrutura de forma simples, didática e segura via WhatsApp/SSH.
