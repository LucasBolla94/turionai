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

# Roadmap – Projeto Turion (FASE 6 → FASE 12 com IA)

> Contexto:
> Até a FASE 5 o Turion já:
> - recebe mensagens
> - filtra segurança
> - entende intenções básicas
> - executa scripts seguros
>
> A partir daqui, a IA entra para:
> - interpretar melhor comandos
> - melhorar respostas
> - planejar ações
> - ajudar em diagnósticos
> - gerar código e ajustes (sempre sob controle)

---

## FASE 6 — Comandos reais + UX inicial (sem IA ainda)

### Objetivo
Consolidar comandos úteis e padronizar respostas.

### Comandos obrigatórios
- `status`
- `help`
- `list scripts`
- `run <script>`

### Melhorias
- Respostas formatadas
- Mensagens claras e consistentes
- Erros sempre explicativos

### Resultado esperado
✅ Turion já é útil  
✅ Base sólida para IA entrar depois

---

## FASE 7 — IA como INTERPRETADOR (Brain v1) ✅

### Objetivo
Usar IA para **entender linguagem natural**, não para executar.

### O que a IA faz
- Converter texto livre em intenção estruturada
- Extrair argumentos
- Identificar ambiguidades
- Fazer perguntas quando necessário

### Exemplos
Usuário:
> “faz o deploy do projeto x”

IA responde internamente:
```json
{
  "intent": "DEPLOY",
  "args": { "project": "x" },
  "missing": ["repo_url"],
  "needs_confirmation": true
}
