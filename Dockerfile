# ============================================================================
# Turion Dockerfile - V1.1.1
# Multi-stage build otimizado para produção
# ============================================================================

# ===== STAGE 1: Build =====
FROM node:20-alpine AS builder

# Metadata
LABEL maintainer="Turion AI"
LABEL version="1.1.1"
LABEL description="Turion - Assistente Pessoal via WhatsApp com Brain System V2"

# Instalar dependências de build
RUN apk add --no-cache python3 make g++

# Diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json (se existir)
COPY package*.json ./

# Instalar dependências
RUN npm ci --production=false

# Copiar código fonte
COPY . .

# Compilar TypeScript
RUN npm run build

# Limpar devDependencies
RUN npm prune --production

# ===== STAGE 2: Production =====
FROM node:20-alpine

# Instalar apenas dependências runtime necessárias
RUN apk add --no-cache \
    tini \
    curl \
    su-exec \
    && rm -rf /var/cache/apk/*

# Criar usuário não-root
RUN addgroup -g 1001 turion && \
    adduser -D -u 1001 -G turion turion

# Diretório de trabalho
WORKDIR /app

# Copiar do stage builder
COPY --from=builder --chown=turion:turion /app/dist ./dist
COPY --from=builder --chown=turion:turion /app/node_modules ./node_modules
COPY --from=builder --chown=turion:turion /app/package*.json ./

# Criar diretórios necessários
RUN mkdir -p logs state auth_info && \
    chown -R turion:turion /app

# Copiar entrypoint script (roda como root para fixar permissões, depois desce para turion)
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expor porta (se necessário no futuro)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Usar tini como init system + entrypoint para fixar permissões
ENTRYPOINT ["/sbin/tini", "--", "docker-entrypoint.sh"]

# Comando padrão (executado como turion via su-exec no entrypoint)
CMD ["node", "dist/index.js"]
