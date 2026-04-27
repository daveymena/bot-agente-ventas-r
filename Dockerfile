FROM node:20-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILD STAGE: compila el frontend y el backend
# Solo necesitas rebuild cuando cambian dependencias
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FROM base AS builder
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig*.json ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/whatsapp-bot run build
RUN pnpm --filter @workspace/api-server run build

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RUNTIME STAGE: imagen liviana para producción
# Para actualizar CÓDIGO: solo reiniciar (segundos)
# Para actualizar DEPENDENCIAS: rebuild (minutos)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FROM base AS runtime
ENV NODE_ENV=production

# Copiar dependencias y código compilado desde builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/artifacts/api-server ./artifacts/api-server
COPY --from=builder /app/artifacts/whatsapp-bot/dist ./artifacts/whatsapp-bot/dist
COPY --from=builder /app/scripts ./scripts

# Scripts de consola y config
COPY .opencode ./.opencode
COPY push.sh ./push.sh
COPY entrypoint.sh ./entrypoint.sh

# Herramientas: git (para pull en runtime), rsync (copia eficiente), opencode (IA en consola)
RUN apt-get update && apt-get install -y --no-install-recommends git curl rsync && \
    rm -rf /var/lib/apt/lists/* && \
    npm install -g opencode-ai && \
    chmod +x /app/push.sh /app/entrypoint.sh

# Directorios persistentes
RUN mkdir -p /app/data/baileys-auth /app/data/uploads
VOLUME ["/app/data"]

ENV PORT=8080
EXPOSE 8080

# El entrypoint descarga el código más reciente de GitHub al arrancar
# Luego inicia el servidor. Para actualizar = solo reiniciar el contenedor.
WORKDIR /app
ENTRYPOINT ["/app/entrypoint.sh"]

