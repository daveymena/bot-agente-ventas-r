# VentaFlow — Sistema de Ventas Automatizado

## Overview

Sistema completo de ventas automatizadas para WhatsApp con IA. Bot conectado vía Baileys (multi-device), panel de control web, agente multi-stage para sales/CRM, soporte de 6 proveedores de IA intercambiables y catálogo real de 81 cursos digitales.

## Architecture

Monorepo pnpm con 3 artefactos:
- `artifacts/api-server` — Backend Express + Drizzle + Baileys
- `artifacts/whatsapp-bot` — Dashboard React (Vite + Radix + Tailwind)
- `artifacts/mockup-sandbox` — Preview interno de componentes

Librerías compartidas en `lib/`:
- `lib/db` — Schema Drizzle (PostgreSQL)
- `lib/api-spec` — OpenAPI spec
- `lib/api-zod` — Tipos generados
- `lib/api-client-react` — Cliente React Query generado

## Stack

- **Backend**: Express 5 + Drizzle ORM + PostgreSQL
- **WhatsApp**: `@whiskeysockets/baileys` (QR real, multi-device, sin Business API)
- **Frontend**: React + Vite + TailwindCSS + Radix UI + Wouter + TanStack Query
- **IA**: Ollama, Groq, OpenRouter, OpenAI, Anthropic, Gemini (cambiables desde UI)

## Schema

- `botConfig` — Configuración del bot (incluye `aiProvider`, `aiApiKey`, `aiModel`, `paymentMethods`, `language`)
- `contacts` — Contactos / leads / clientes (con stages: lead, prospect, customer, vip)
- `conversations` — Conversaciones (con `salesStage` para multi-agente)
- `messages` — Historial de mensajes
- `products` — Catálogo (cargado desde `scripts/data/products.json`)
- `automationRules` — Reglas de automatización
- `agentSessions` — Sesiones del agente IA
- `skills` — Skills custom JS para el agente
- `memories` — Memorias persistentes del agente

## Endpoints clave

- `GET/POST /api/bot/status|connect|disconnect|qr|config` — Bot WhatsApp (Baileys real)
- `GET/PUT /api/ai/config` + `POST /api/ai/test` + `GET /api/ai/providers` — Multi-IA
- `POST /api/products/import/json` — Importar catálogo JSON
- `POST /api/agent/chat` — Chat con agente VentaFlow (con tools)
- CRUD para conversations, contacts, products, automations, skills, memories

## Multi-agent prompts

El agente VentaFlow tiene 6 prompts especializados según etapa de venta:
1. `welcome` — Saludo inicial
2. `detection` — Detección de necesidad
3. `presentation` — Presentación del producto
4. `objection` — Manejo de objeciones
5. `closure` — Cierre de venta
6. `postsale` — Post-venta y seguimiento

Cada prompt interpola `{business}`, `{payments}`, `{language}` desde la config.

## Páginas del dashboard

1. **Dashboard** — Métricas + estado del bot + QR
2. **Conversations** — Lista + chat
3. **Contacts** — CRM con stages
4. **Products** — Catálogo + import JSON
5. **Automations** — Reglas
6. **Settings** — Config del bot, idioma, métodos de pago
7. **VentaFlow Agent** — Chat con agente IA + sesiones
8. **Skills** — Skills JS personalizados
9. **Memory** — Memorias del agente
10. **AI Providers** — Selector multi-IA

## WhatsApp (Baileys)

- Las credenciales se persisten en `artifacts/api-server/.baileys-auth/` (gitignored).
- En producción, montar como volumen en `/app/data/baileys-auth`.
- El QR se genera como Data URL PNG y se expone en `GET /api/bot/qr`.
- `POST /api/bot/disconnect` borra las credenciales para forzar nuevo QR.

## Deployment (EasyPanel)

`docker-compose.yml` define:
- `ventaflow-api` — Backend
- `ventaflow-web` — Frontend (nginx) + proxy `/api` al backend
- `ventaflow-db` — PostgreSQL 16

`Dockerfile` multi-stage usando `node:20-bookworm-slim` + pnpm.

Volúmenes persistentes: `ventaflow_data` (Baileys auth) y `ventaflow_pg` (DB).

## Catálogo

81 productos en 13 categorías. Imágenes en `artifacts/whatsapp-bot/public/products/*.png` (11 únicas, generadas con AI).

## Comandos útiles

```bash
pnpm --filter @workspace/db run push          # migrar schema
pnpm --filter @workspace/scripts run seed     # poblar DB con catálogo real
pnpm --filter @workspace/api-server run dev   # API en desarrollo
pnpm --filter @workspace/whatsapp-bot run dev # Dashboard en desarrollo
```

## Configuración inicial

1. Migrar DB: `pnpm --filter @workspace/db run push`
2. Cargar catálogo: `pnpm --filter @workspace/scripts run seed`
3. Abrir dashboard → AI Providers → activar proveedor
4. Dashboard → "Connect WhatsApp" → escanear QR
