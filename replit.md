# Workspace - Bot de Ventas WhatsApp + OpenClaw

## Overview

Sistema completo de bot de ventas para WhatsApp con IA, basado en el ecosistema OpenClaw, conectado a Ollama hosteado en EasyPanel para procesamiento de lenguaje natural. Panel de control web completo para gestionar el bot, conversaciones, contactos, catálogo de productos y automatizaciones.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS
- **IA**: Ollama en EasyPanel (https://n8n-ollama.ginee6.easypanel.host)
- **WhatsApp**: OpenClaw con Baileys

## Modelos Ollama Disponibles

- `qwen2.5:0.5b` — Modelo más rápido, ideal para respuestas simples
- `qwen2.5:1.5b` — **Recomendado** — buen balance velocidad/calidad
- `llama3.2:1b` — Alternativa con Llama

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (backend)
│   └── whatsapp-bot/       # React + Vite frontend (panel de control)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
│   └── src/seed.ts         # Script para cargar datos de ejemplo
```

## Database Schema

- `bot_config` — Configuración del bot (mensaje bienvenida, system prompt, modelo Ollama, horarios)
- `contacts` — Contactos/clientes con etapas de venta (lead/prospect/customer/vip)
- `conversations` — Conversaciones de WhatsApp activas
- `messages` — Mensajes individuales (inbound/outbound, aiGenerated flag)
- `products` — Catálogo de productos con precio y stock
- `automation_rules` — Reglas de automatización (keyword, first_message, etc.)

## API Endpoints Principales

- `GET /api/bot/status` — Estado del bot
- `PUT /api/bot/config` — Configurar el bot
- `GET /api/bot/qr` — QR para conectar WhatsApp
- `POST /api/bot/connect` — Iniciar conexión
- `GET /api/conversations` — Lista de conversaciones
- `GET /api/conversations/:id/messages` — Mensajes
- `POST /api/conversations/:id/send` — Enviar mensaje
- `GET /api/contacts` — Clientes
- `GET /api/products` — Catálogo
- `GET /api/automation/rules` — Reglas de automatización
- `GET /api/ollama/models` — Modelos disponibles en Ollama
- `POST /api/ollama/test` — Probar la IA con un mensaje
- `GET /api/messages/stats` — Estadísticas

## Páginas del Panel

1. **Dashboard** — Estadísticas, gráfico de tráfico, estado del bot
2. **Conversaciones** — Lista de chats con mensajes y respuesta manual
3. **Contactos** — CRM básico con etapas de venta
4. **Productos** — Catálogo CRUD
5. **Automatizaciones** — Reglas de trigger/acción
6. **Configuración** — Bot config + Ollama config + test de IA

## Scripts Útiles

- `pnpm --filter @workspace/scripts run seed` — Cargar datos de ejemplo
- `pnpm --filter @workspace/api-spec run codegen` — Regenerar clientes API
- `pnpm --filter @workspace/db run push` — Aplicar cambios de schema
