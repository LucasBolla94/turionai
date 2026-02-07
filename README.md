# 🤖 Turion - Assistente Pessoal via WhatsApp

[![Version](https://img.shields.io/badge/version-1.1.1-blue.svg)](https://github.com/LucasBolla94/turionai)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)](Dockerfile)

**Turion V1.1.1** - Assistente pessoal inteligente com **Brain System V2**, integrado ao WhatsApp via Baileys.

## ✨ Características

- 🧠 **Brain System V2** - Sistema modular inteligente com Orchestrator, Agents e Memory
- 💬 **WhatsApp Integration** - Conexão nativa via Baileys
- 🎯 **Feature Flags** - Sistema de ativação/desativação de funcionalidades
- 🔄 **Auto-restart** - Recuperação automática de erros
- 🐳 **Docker Ready** - Deploy isolado e seguro
- 🔒 **Auditoria completa** - Logs e histórico em JSONL

---

## 🚀 Instalação Rápida

### 🐳 Docker (Recomendado - Mais Seguro)

**Funciona em Linux, macOS e Windows!**

```bash
# 1. Clonar repositório
git clone https://github.com/LucasBolla94/turionai.git
cd turionai

# 2. Configurar API Keys
cp .env.example .env
# Edite .env e adicione sua ANTHROPIC_API_KEY

# 3. Iniciar com Docker
docker-compose up -d

# 4. Ver logs e escanear QR Code
docker-compose logs -f turion
```

**Pronto!** Escaneie o QR Code com WhatsApp e comece a usar.

---

### ⚡ PM2 (Alternativa Leve)

**Linux/macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/LucasBolla94/turionai/main/install.sh | bash
```

**Windows (PowerShell como Admin):**
```powershell
iwr -useb https://raw.githubusercontent.com/LucasBolla94/turionai/main/install.ps1 | iex
```

---

## 📱 Conectar WhatsApp

1. Execute o comando para ver logs:
   - **Docker:** `docker-compose logs -f turion`
   - **PM2:** `pm2 logs turion`

2. Escaneie o QR Code que aparecerá nos logs:
   - Abrir WhatsApp no celular
   - Menu → Aparelhos conectados
   - Conectar novo aparelho
   - Escanear QR Code

3. **Pronto!** Envie "Oi" no WhatsApp conectado para testar

---

## 🎮 Comandos Úteis

### Docker 🐳

```bash
# Ver logs
docker-compose logs -f turion

# Reiniciar
docker-compose restart turion

# Parar
docker-compose down

# Atualizar
git pull && docker-compose up -d --build
```

### PM2 ⚡

```bash
# Ver logs
pm2 logs turion

# Reiniciar
pm2 restart turion

# Parar
pm2 stop turion

# Monitorar
pm2 monit
```

---

## 🧠 Brain System V2

O **Brain System V2** é a arquitetura modular que gerencia todas as funcionalidades do Turion:

```
Gateway → Orchestrator → Agents → Memory → Actions
                      ↓
              Feature Flags (Controle fino)
```

### Funcionalidades Ativas (v1.1.1)

✅ **Phase 1 - Fundação (100% - 8/8)**
- Gateway de mensagens com deduplicação
- Orchestrator inteligente
- Memory System (curto/longo prazo)
- Feature Flags System
- WhatsApp Integration

🚧 **Phase 2 - Inteligência (Em desenvolvimento)**
- Auto-Approval System
- Email Agent
- Task Manager Agent
- Notification Agent

---

## 🔧 Configuração (.env)

### Variáveis Essenciais

```env
# API Keys (Obrigatório)
ANTHROPIC_API_KEY=sk-ant-xxxxx
XAI_API_KEY=your_grok_api_key_here

# Feature Flags Brain V2 (Opcional)
TURION_USE_GATEWAY=true
TURION_USE_ORCHESTRATOR=true
TURION_USE_MEMORY=true
TURION_AUTO_APPROVE=false

# Configurações Gerais
TURION_XAI_MODEL=grok-4-1-fast-reasoning
TURION_ALLOWLIST=
TURION_TIMEZONE=America/Sao_Paulo
```

Copie `.env.example` para `.env` e configure suas chaves.

---

## 📚 Documentação

- 📖 **[Guia de Instalação Completo](INSTALL.md)** - Instruções detalhadas
- 🚀 **[Início Rápido](GETTING-STARTED-V1.1.1.md)** - Tutorial inicial
- 🛣️ **[Roadmap](roadmap-v1.1.1.md)** - Planejamento de features
- 📝 **[Updates](Updates.md)** - Histórico de atualizações
- 🏗️ **[Arquitetura](V1.1.1.md)** - Documentação técnica
- 🧠 **[Brain V2 Integration](BRAIN_V2_INTEGRATION.md)** - Guia do Brain System

---

## 🐛 Solução de Problemas

### QR Code não aparece

**Docker:**
```bash
docker-compose logs -f turion
docker-compose restart turion
```

**PM2:**
```bash
pm2 logs turion --lines 100
pm2 restart turion
```

### WhatsApp desconecta

- Verifique se o celular está conectado à internet
- Não use WhatsApp em outro dispositivo simultaneamente
- Confira os logs para detalhes

### Container não inicia (Docker)

```bash
# Ver logs detalhados
docker-compose logs turion

# Reconstruir imagem
docker-compose down
docker-compose up -d --build
```

### Mais problemas?

Consulte o [Guia de Instalação Completo](INSTALL.md#-solução-de-problemas)

---

## 📊 Status do Projeto

**Versão:** 1.1.1
**Progresso:** 28.6% (8/28 features)
**Phase 1:** ✅ COMPLETA (8/8)
**Phase 2:** 🚧 Em desenvolvimento (0/8)

---

## 📁 Estrutura de Arquivos

```
turionai/
├── src/                    # Código TypeScript
│   ├── brain/              # Brain System V2
│   │   ├── gateway/        # Gateway de mensagens
│   │   ├── orchestrator/   # Orchestrator inteligente
│   │   ├── agents/         # Agents especializados
│   │   └── memory/         # Memory System
│   ├── channels/           # Integração WhatsApp
│   └── features/           # Feature Flags
├── state/                  # Dados persistidos
│   ├── conversations/      # Conversas JSONL
│   ├── memory/             # Memória do sistema
│   └── audit/              # Logs de auditoria
├── logs/                   # Logs de aplicação
├── auth_info/              # Autenticação WhatsApp
├── Dockerfile              # Build multi-stage
├── docker-compose.yml      # Configuração Docker
└── .env                    # Variáveis de ambiente
```

---

## 🤝 Contribuindo

Contribuições são bem-vindas!

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add: AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 🆘 Suporte

- **Issues:** [GitHub Issues](https://github.com/LucasBolla94/turionai/issues)
- **Discussões:** [GitHub Discussions](https://github.com/LucasBolla94/turionai/discussions)

---

## 🚀 Próximos Passos

Após instalar o Turion:

1. ✅ Escaneie o QR Code do WhatsApp
2. ✅ Envie "Oi" para testar a conexão
3. ✅ Teste comandos básicos
4. 📖 Leia a [documentação completa](GETTING-STARTED-V1.1.1.md)
5. 🎯 Configure Feature Flags conforme necessário

---

**Desenvolvido com ❤️ por Turion AI**

🌟 **Star este repositório** se você achou útil!
