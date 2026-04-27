# VentaFlow — Sistema de Ventas Automatizado

Bot de ventas para WhatsApp con IA + panel de control web profesional.
Multi-proveedor de IA (Ollama, Groq, OpenRouter, OpenAI, Anthropic, Gemini), agente multi-stage, CRM y catálogo de cursos digitales.

## ✨ Características Principales

- 🤖 **Bot de WhatsApp** con QR real (Baileys multi-device)
- 🧠 **6 proveedores de IA** con cambio en caliente: Ollama, Groq, OpenRouter, OpenAI, Anthropic, Gemini
- 📊 **Dashboard web profesional** con diseño moderno y gradientes
- 🛒 **Sistema de categorías** con 13 categorías predefinidas y colores personalizados
- 📦 **Catálogo de 81 cursos digitales** pre-cargados
- 💬 **Agente multi-stage** (saludo → detección → presentación → objeciones → cierre → post-venta)
- 🔧 **Skills personalizados** y memorias persistentes
- 💳 **Métodos de pago** configurables (Nequi, Daviplata, Bancolombia, PSE)
- 🌐 **Multi-idioma** (ES/EN)
- 🎨 **Diseño profesional** con glass-morphism y animaciones
- 🔄 **Preparado para SaaS** multi-tenant

## 🎨 Categorías de Productos

El sistema incluye 13 categorías profesionales con iconos y colores:

- 🎨 **DISEÑO** - Photoshop, Illustrator, InDesign, Corel
- 💼 **OFFICE** - Word, PowerPoint, Access, Outlook
- 🌍 **IDIOMAS** - Inglés, Francés, Alemán, Italiano
- 📊 **EXCEL** - Básico a Avanzado, Macros, VBA
- 💻 **TECH** - Programación, Desarrollo Web, Apps
- 📱 **MARKETING** - Digital, Redes Sociales, SEO
- 🎵 **MÚSICA** - Piano, Guitarra, Producción Musical
- 🏥 **SALUD** - Nutrición, Fitness, Bienestar
- 💰 **NEGOCIOS** - Emprendimiento, Finanzas, Ventas
- ⚙️ **INGENIERÍA** - AutoCAD, Civil, Mecánica
- 📚 **EDUCATIVO** - Pedagogía, Didáctica
- 🔧 **OFICIO** - Electricidad, Plomería, Carpintería
- ✂️ **CRAFT** - Manualidades, Costura, Artesanía

## 🚀 Stack Tecnológico

- **Backend**: Node.js + Express + Drizzle ORM + PostgreSQL
- **Frontend**: React + Vite + TailwindCSS + Radix UI
- **WhatsApp**: Baileys (multi-device, sin necesidad de WhatsApp Business API)
- **IA**: 6 proveedores intercambiables desde la UI
- **Monorepo**: pnpm workspaces
- **Despliegue**: Docker + Docker Compose + EasyPanel

## 📦 Quick Start (Desarrollo Local)

```bash
# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Migrar base de datos
pnpm --filter @workspace/db run push

# Cargar catálogo de productos
pnpm --filter @workspace/scripts run seed

# Iniciar backend
pnpm --filter @workspace/api-server run dev

# Iniciar frontend (en otra terminal)
pnpm --filter @workspace/whatsapp-bot run dev
```

Abrir el dashboard en `http://localhost:5173`, ir a **Settings** o al botón **Connect WhatsApp** del Dashboard, escanear el QR con WhatsApp.

## 🌐 Despliegue en EasyPanel

### Opción 1: Con Base de Datos de EasyPanel (Recomendado)

1. **Crear base de datos PostgreSQL en EasyPanel**:
   - Usuario: `postgres`
   - Contraseña: (genera una segura)
   - Base de datos: `tecnovariedades`

2. **Configurar variables de entorno**:
```bash
DATABASE_URL=postgres://postgres:PASSWORD@HOST:PORT/tecnovariedades?sslmode=disable
```

3. **Usar docker-compose.easypanel.yml**:
```bash
docker-compose -f docker-compose.easypanel.yml up -d
```

4. **Ejecutar migraciones**:
```bash
docker exec ventaflow-api pnpm --filter @workspace/db run push
docker exec ventaflow-api pnpm --filter @workspace/scripts run seed
```

### Opción 2: Con Base de Datos Local

```bash
docker-compose up -d
```

Ver guía completa en [EASYPANEL-DEPLOY.md](./EASYPANEL-DEPLOY.md)

## 🗂️ Estructura del Monorepo

```
artifacts/
  api-server/          # Backend Express + Baileys
  whatsapp-bot/        # Dashboard React
  mockup-sandbox/      # Preview de componentes
lib/
  db/                  # Schema Drizzle + Migraciones
  api-spec/            # OpenAPI spec
  api-zod/             # Tipos generados
  api-client-react/    # Cliente React Query generado
scripts/
  src/seed.ts          # Seed con 81 productos reales
  data/products.json   # Catálogo completo
```

## 🎨 Diseño Profesional

El nuevo diseño incluye:

- **Tema oscuro moderno** con gradientes
- **Glass-morphism** en tarjetas y componentes
- **Animaciones suaves** en hover y transiciones
- **Sistema de colores** por categoría
- **Badges personalizados** con iconos emoji
- **Vista grid y lista** para productos
- **Búsqueda y filtros** avanzados
- **Productos destacados** con badge especial

## 🔧 Configuración del Proveedor de IA

Ir a `/ai-providers` en el dashboard. Seleccionar proveedor → ingresar API key → elegir modelo → **Activar**.

| Proveedor | Tier | Cómo obtener API Key |
|-----------|------|----------------------|
| Ollama | Free | No requiere (self-hosted) |
| Groq | Free | console.groq.com/keys |
| OpenRouter | Free + Paid | openrouter.ai/keys |
| OpenAI | Paid | platform.openai.com |
| Anthropic | Paid | console.anthropic.com |
| Gemini | Free + Paid | aistudio.google.com/app/apikey |

## 🔐 Seguridad y Mejores Prácticas

- ✅ Variables de entorno para credenciales
- ✅ PostgreSQL con contraseñas seguras
- ✅ Volúmenes persistentes para WhatsApp auth
- ✅ Health checks en Docker
- ✅ SSL/TLS en producción
- ✅ Backups automáticos recomendados
- ✅ Preparado para multi-tenancy

## 🚀 Preparación para SaaS Multi-Tenant

El sistema está diseñado para escalar a SaaS. Próximos pasos:

1. **Agregar tabla de tenants**
2. **Campo tenant_id en todas las tablas**
3. **Middleware de detección de tenant**
4. **Aislamiento de datos por tenant**
5. **Planes y facturación**
6. **Dashboard de administración**

Ver más detalles en [EASYPANEL-DEPLOY.md](./EASYPANEL-DEPLOY.md#-preparación-para-saas-multi-tenant)

## 📊 Catálogo de Productos

Los 81 cursos se cargan desde `scripts/data/products.json` con imágenes en `artifacts/whatsapp-bot/public/products/`.

Cada producto incluye:
- Nombre comercial
- Descripción detallada con emoji
- Precio (COP)
- Categoría con color e icono
- Número de secciones y clases
- Duración total
- Beneficios
- Imagen de portada

## 🔄 Actualización del Sistema

```bash
# Pull cambios
git pull origin main

# Instalar dependencias
pnpm install

# Rebuild
pnpm run build

# Restart servicios
docker-compose restart
```

## 📝 Licencia

MIT

---

**Desarrollado con ❤️ para automatizar ventas por WhatsApp**
