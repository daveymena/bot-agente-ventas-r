# VentaFlow — Sistema de Ventas Automatizado

Bot de ventas para WhatsApp con IA + panel de control web.
Multi-proveedor de IA (Ollama, Groq, OpenRouter, OpenAI, Anthropic, Gemini), agente multi-stage, CRM y catálogo de cursos digitales.

## Stack

- **Backend**: Node.js + Express + Drizzle ORM + PostgreSQL
- **Frontend**: React + Vite + TailwindCSS + Radix UI
- **WhatsApp**: Baileys (multi-device, sin necesidad de WhatsApp Business API)
- **IA**: 6 proveedores intercambiables desde la UI
- **Monorepo**: pnpm workspaces

## Características

- 🤖 Bot de WhatsApp con QR real (Baileys multi-device)
- 🧠 6 proveedores de IA con cambio en caliente: Ollama, Groq, OpenRouter, OpenAI, Anthropic, Gemini
- 📊 Dashboard web con conversaciones, contactos, productos, automatizaciones
- 🛒 Catálogo de 81 cursos digitales pre-cargados
- 💬 Agente multi-stage (saludo → detección → presentación → objeciones → cierre → post-venta)
- 🔧 Skills personalizados y memorias persistentes
- 💳 Métodos de pago configurables (Nequi, Daviplata, Bancolombia, PSE)
- 🌐 Multi-idioma (ES/EN)

## Quick start (desarrollo)

```bash
pnpm install
pnpm --filter @workspace/db run push   # migrar DB
pnpm --filter @workspace/scripts run seed   # cargar catálogo real
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/whatsapp-bot run dev
```

Abrir el dashboard, ir a **Settings** o al botón **Connect WhatsApp** del Dashboard, escanear el QR con WhatsApp.

## Despliegue en EasyPanel

1. Crear nuevo proyecto en EasyPanel.
2. Subir este repositorio o conectar con GitHub.
3. Configurar variables de entorno (ver `.env.example`).
4. EasyPanel detectará el `docker-compose.yml` y levantará 3 servicios:
   - `ventaflow-api` (backend en puerto 8080)
   - `ventaflow-web` (frontend nginx en 8081)
   - `ventaflow-db` (PostgreSQL 16)
5. Tras el primer arranque, ejecutar el seed:
   ```bash
   docker exec ventaflow-api pnpm --filter @workspace/scripts run seed
   ```

### Volúmenes persistentes

- `ventaflow_data:/app/data` — credenciales de WhatsApp (Baileys auth)
- `ventaflow_pg:/var/lib/postgresql/data` — base de datos

## Estructura del monorepo

```
artifacts/
  api-server/          # Backend Express
  whatsapp-bot/        # Dashboard React
  mockup-sandbox/      # Preview de componentes
lib/
  db/                  # Schema Drizzle
  api-spec/            # OpenAPI spec
  api-zod/             # Tipos generados
  api-client-react/    # Cliente React Query generado
scripts/
  src/seed.ts          # Seed real
  data/products.json   # 81 cursos digitales
```

## Catálogo de productos

Los 81 cursos se cargan desde `scripts/data/products.json` con imágenes generadas en `artifacts/whatsapp-bot/public/products/`.

Categorías: Diseño, Office, Idiomas, Excel, Tech, Marketing, Música, Salud, Negocios, Ingeniería, Educativo, Oficio, Craft.

## Configuración del proveedor de IA

Ir a `/ai-providers` en el dashboard. Seleccionar proveedor → ingresar API key → elegir modelo → **Activar**.

| Proveedor | Tier | Cómo obtener API Key |
|-----------|------|----------------------|
| Ollama | Free | No requiere (self-hosted) |
| Groq | Free | console.groq.com/keys |
| OpenRouter | Free + Paid | openrouter.ai/keys |
| OpenAI | Paid | platform.openai.com |
| Anthropic | Paid | console.anthropic.com |
| Gemini | Free + Paid | aistudio.google.com/app/apikey |

## Licencia

MIT
