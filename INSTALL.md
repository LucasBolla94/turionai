# 🚀 Guia de Instalação - Turion V1.1.1

Instalação rápida e automatizada do Turion com Brain System V2.

---

## 📋 Pré-requisitos

- **Node.js** >= 18.x (será instalado automaticamente se não existir)
- **Git** (será instalado automaticamente se não existir)
- **Chave API da Anthropic** (obtenha em: https://console.anthropic.com/)

---

## 🐧 Linux / macOS

### Instalação Rápida (1 comando) - Estilo OpenClaw

```bash
curl -fsSL https://raw.githubusercontent.com/LucasBolla94/turionai/main/install.sh | bash
```

### Instalação Manual

```bash
# 1. Baixar script
curl -fsSL https://raw.githubusercontent.com/LucasBolla94/turionai/main/install.sh -o install.sh

# 2. Dar permissão de execução
chmod +x install.sh

# 3. Executar instalador
./install.sh
```

---

## 🪟 Windows

### Instalação Rápida (PowerShell como Administrador) - Estilo OpenClaw

```powershell
iwr -useb https://raw.githubusercontent.com/LucasBolla94/turionai/main/install.ps1 | iex
```

**Alternativa (mais verbosa):**

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; `
iwr https://raw.githubusercontent.com/LucasBolla94/turionai/main/install.ps1 -UseBasicParsing | iex
```

### Instalação Manual

```powershell
# 1. Abrir PowerShell como Administrador

# 2. Clonar repositório
git clone https://github.com/LucasBolla94/turionai.git
cd turionai

# 3. Executar instalador
.\install.ps1
```

---

## 🐳 Docker vs PM2 - Qual usar?

O Turion suporta **ambas as opções**. Escolha conforme seu ambiente:

### Docker 🐳 (Recomendado para Produção)

**Vantagens:**
- ✅ Isolamento completo do sistema
- ✅ Portabilidade máxima
- ✅ Fácil escalar e replicar
- ✅ Padrão em Cloud/Kubernetes

**Instalação Docker:**
```bash
# Com docker-compose
docker-compose up -d

# Ou com Docker direto
docker run -d --name turion \
  --restart unless-stopped \
  -v $(pwd):/app \
  -v $(pwd)/state:/app/state \
  --env-file .env \
  node:20-alpine \
  sh -c "cd /app && npm install && npm start"
```

### PM2 ⚡ (Recomendado para VPS/Desenvolvimento)

**Vantagens:**
- ✅ Mais leve (sem overhead do Docker)
- ✅ Setup mais simples
- ✅ Monitoramento integrado
- ✅ Ótimo para um único servidor

**Instalação PM2:** Use os scripts acima!

---

## ⚙️ O que o instalador faz?

1. ✅ Verifica e instala dependências (Node.js, Git, PM2)
2. ✅ Clona o repositório do Turion
3. ✅ Instala dependências do projeto
4. ✅ Compila o TypeScript
5. ✅ Executa wizard de configuração interativo
6. ✅ Configura PM2 com auto-restart
7. ✅ Configura startup automático (reinicia com o sistema)

---

## 🔧 Wizard de Configuração

O wizard interativo vai solicitar:

### 1. **Anthropic API Key** (Obrigatório)
- Acesse: https://console.anthropic.com/
- Crie uma API Key
- Cole quando solicitado

### 2. **Supabase** (Opcional)
- URL do projeto
- Anon/Public Key

### 3. **Email** (Opcional)
- Usuário
- Senha ou senha de app
- Host IMAP (padrão: imap.gmail.com)
- Porta (padrão: 993)

### 4. **Brain System V2** (Recomendado)
- Ativar/Desativar o novo sistema inteligente

---

## 📱 Conectar WhatsApp

Após a instalação:

```bash
# Ver logs (QR Code aparecerá aqui)
pm2 logs turion

# Escanear QR Code com WhatsApp:
# 1. Abrir WhatsApp no celular
# 2. Menu > Aparelhos conectados
# 3. Conectar novo aparelho
# 4. Escanear QR Code
```

---

## 🎮 Comandos Úteis

### PM2 (Produção)

```bash
# Ver logs
pm2 logs turion

# Monitorar
pm2 monit

# Reiniciar
pm2 restart turion

# Parar
pm2 stop turion

# Status
pm2 status

# Deletar
pm2 delete turion
```

### NPM (Desenvolvimento)

```bash
# Modo desenvolvimento (hot reload)
npm run dev

# Compilar TypeScript
npm run build

# Iniciar produção
npm start

# Executar setup novamente
npm run setup
```

---

## 🔄 Auto-Restart e Startup Automático

### Linux/macOS

O instalador já configura automaticamente. Para verificar:

```bash
pm2 startup
pm2 save
```

### Windows

O instalador já configura automaticamente com `pm2-windows-startup`.

Para verificar:

```powershell
pm2-startup install
pm2 save
```

---

## 🐛 Solução de Problemas

### PM2 não está instalado

```bash
npm install -g pm2
```

### Erro de permissão (Linux/macOS)

```bash
sudo npm install -g pm2
```

### Erro "cannot find module" após atualização

```bash
cd ~/turion  # ou caminho da instalação
npm install
npm run build
pm2 restart turion
```

### QR Code não aparece

```bash
# Ver logs detalhados
pm2 logs turion --lines 100

# Reiniciar
pm2 restart turion
```

### WhatsApp desconecta frequentemente

Verifique:
1. Celular está conectado à internet
2. WhatsApp não está aberto em outro dispositivo
3. Logs do PM2: `pm2 logs turion`

---

## 📁 Estrutura de Diretórios

```
~/turion/               # Diretório de instalação
├── dist/               # JavaScript compilado
├── src/                # Código TypeScript
├── logs/               # Logs do PM2
├── state/              # Estado do bot (memória, flags)
├── auth_info/          # Autenticação WhatsApp
├── .env                # Configurações (criado pelo wizard)
├── ecosystem.config.js # Configuração do PM2
└── setup-wizard.js     # Wizard de configuração
```

---

## 🔒 Segurança

- ⚠️ **Nunca** compartilhe seu arquivo `.env`
- ⚠️ **Nunca** commite `.env` no Git (já está no .gitignore)
- ⚠️ **Nunca** compartilhe sua API Key da Anthropic
- 🔒 Mantenha `auth_info/` privado (contém sessão WhatsApp)

---

## 📚 Documentação Completa

- **Roadmap:** [roadmap-v1.1.1.md](roadmap-v1.1.1.md)
- **Updates:** [Updates.md](Updates.md)
- **Arquitetura:** [V1.1.1.md](V1.1.1.md)
- **Guia de início:** [GETTING-STARTED-V1.1.1.md](GETTING-STARTED-V1.1.1.md)

---

## 🆘 Suporte

- **Issues:** https://github.com/LucasBolla94/turionai/issues
- **Discussões:** https://github.com/LucasBolla94/turionai/discussions

---

## 📝 Logs e Monitoramento

### Ver logs em tempo real

```bash
pm2 logs turion
```

### Ver últimas 100 linhas

```bash
pm2 logs turion --lines 100
```

### Monitorar recursos (CPU, memória)

```bash
pm2 monit
```

### Ver erros apenas

```bash
pm2 logs turion --err
```

---

## 🔄 Atualização

Para atualizar para nova versão:

```bash
cd ~/turion
git pull
npm install
npm run build
pm2 restart turion
```

---

## ✅ Checklist Pós-Instalação

- [ ] PM2 está rodando (`pm2 status`)
- [ ] Turion aparece como "online" no PM2
- [ ] QR Code foi escaneado com sucesso
- [ ] WhatsApp conectado
- [ ] Brain V2 ativado (.env tem `TURION_USE_BRAIN_V2=true`)
- [ ] API Anthropic configurada
- [ ] Teste enviando mensagem no WhatsApp

---

🎉 **Pronto! Turion está instalado e rodando!**

Se tudo está funcionando, você pode:
1. Enviar "Oi" no WhatsApp conectado
2. Ver o Turion responder
3. Testar comandos como "Me lembra de fazer café em 5min"

**Bom trabalho com o Turion!** 🚀
