FROM node:20-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- Build stage ----
FROM base AS builder
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig*.json ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/whatsapp-bot run build
RUN pnpm --filter @workspace/api-server run build

# ---- Runtime stage ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/artifacts/api-server ./artifacts/api-server
COPY --from=builder /app/artifacts/whatsapp-bot/dist ./artifacts/whatsapp-bot/dist
COPY --from=builder /app/scripts ./scripts
# Copiar config de OpenCode al contenedor
COPY .opencode ./.opencode

# Herramientas de desarrollo en consola (OpenCode AI + git)
RUN apt-get update && apt-get install -y --no-install-recommends git curl && \
    rm -rf /var/lib/apt/lists/* && \
    npm install -g opencode-ai

# Persistent dirs (mount as volumes in EasyPanel)
RUN mkdir -p /app/data/baileys-auth /app/data/uploads
VOLUME ["/app/data"]

# API server is the main entrypoint (it can also serve the bot dashboard)
WORKDIR /app/artifacts/api-server
ENV PORT=8080
EXPOSE 8080
CMD ["node", "--import", "tsx/esm", "src/index.ts"]
