# 🚀 Guía de Despliegue en EasyPanel

Esta guía te ayudará a desplegar VentaFlow en EasyPanel con PostgreSQL.

## 📋 Requisitos Previos

1. Cuenta en EasyPanel
2. Base de datos PostgreSQL creada en EasyPanel
3. Repositorio Git con el código

## 🗄️ Paso 1: Crear Base de Datos PostgreSQL

1. En EasyPanel, ve a **Databases** → **Create Database**
2. Selecciona **PostgreSQL**
3. Configura:
   - **Name**: `tecnovariedades` (o el nombre que prefieras)
   - **User**: `postgres`
   - **Password**: Genera una contraseña segura
4. Anota los datos de conexión que te proporciona EasyPanel:
   - Host interno (ej: `tecnovariedades_bot-whatsapp-db`)
   - Puerto interno (ej: `5432`)
   - Host externo (ej: `79.143.187.160`)
   - Puerto externo (ej: `5433`)

## 🔧 Paso 2: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con la siguiente configuración:

```bash
# Base de datos (usar URL interna para producción)
DATABASE_URL=postgres://postgres:TU_PASSWORD@tecnovariedades_bot-whatsapp-db:5432/tecnovariedades?sslmode=disable

# O usar URL externa para desarrollo/migración
# DATABASE_URL=postgres://postgres:TU_PASSWORD@79.143.187.160:5433/tecnovariedades?sslmode=disable

# Servidor
NODE_ENV=production
PORT=8080

# AI Provider
AI_PROVIDER=ollama
AI_MODEL=qwen2.5:1.5b
OLLAMA_URL=https://n8n-ollama.ginee6.easypanel.host
AI_FALLBACK_ENABLED=true
AI_FALLBACK_PROVIDER=ollama

# Pagos Colombia
TRANSFER_NEQUI=3001234567
TRANSFER_DAVIPLATA=3001234567
TRANSFER_BANCOLOMBIA=1234567890
TRANSFER_NAME=Tu Nombre

# WhatsApp
BAILEYS_AUTH_DIR=./.baileys-auth
TYPING_DELAY_MIN=800
TYPING_DELAY_MAX=2000
READ_RECEIPT_DELAY=500
```

## 📦 Paso 3: Desplegar en EasyPanel

### Opción A: Usando Docker Compose (Recomendado)

1. En EasyPanel, crea un nuevo **App**
2. Selecciona **Docker Compose**
3. Usa el archivo `docker-compose.easypanel.yml`:

```yaml
version: "3.9"

services:
  ventaflow-api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ventaflow-api
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
      - DATABASE_URL=${DATABASE_URL}
      - AI_PROVIDER=${AI_PROVIDER:-ollama}
      - AI_MODEL=${AI_MODEL:-qwen2.5:1.5b}
      - OLLAMA_URL=${OLLAMA_URL}
    volumes:
      - ventaflow_data:/app/data
      - ventaflow_baileys:/app/.baileys-auth

  ventaflow-web:
    image: nginx:alpine
    container_name: ventaflow-web
    restart: unless-stopped
    ports:
      - "8081:80"
    volumes:
      - ./artifacts/whatsapp-bot/dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - ventaflow-api

volumes:
  ventaflow_data:
  ventaflow_baileys:
```

4. Configura las variables de entorno en EasyPanel
5. Despliega la aplicación

### Opción B: Despliegue Manual

1. **Build del proyecto localmente**:
```bash
pnpm install
pnpm run build
```

2. **Subir archivos a EasyPanel**:
   - Sube el directorio completo al servidor
   - O conecta tu repositorio Git

3. **Ejecutar migraciones**:
```bash
# Conectar a la base de datos y crear las tablas
pnpm --filter @workspace/db run push

# Cargar datos iniciales (catálogo de productos)
pnpm --filter @workspace/scripts run seed
```

## 🔄 Paso 4: Migrar Base de Datos

Una vez desplegado, ejecuta las migraciones:

```bash
# Conectar al contenedor
docker exec -it ventaflow-api bash

# Ejecutar migraciones
pnpm --filter @workspace/db run push

# Cargar catálogo de productos
pnpm --filter @workspace/scripts run seed
```

## 🌐 Paso 5: Configurar Dominios

1. En EasyPanel, ve a tu aplicación
2. Configura los dominios:
   - **API**: `api.tudominio.com` → Puerto 8080
   - **Dashboard**: `dashboard.tudominio.com` → Puerto 8081
3. Habilita SSL automático

## ✅ Paso 6: Verificar Instalación

1. Accede al dashboard: `https://dashboard.tudominio.com`
2. Ve a **Settings** → **Connect WhatsApp**
3. Escanea el código QR con WhatsApp
4. Prueba enviando un mensaje al número conectado

## 🔐 Seguridad

### Recomendaciones:

1. **Cambiar contraseñas por defecto**:
   - Genera contraseñas seguras para PostgreSQL
   - No uses las contraseñas de ejemplo

2. **Configurar firewall**:
   - Restringe acceso a la base de datos solo desde la aplicación
   - Usa la URL interna de la base de datos en producción

3. **Backups automáticos**:
   - Configura backups diarios de PostgreSQL en EasyPanel
   - Exporta el volumen `ventaflow_baileys` regularmente (credenciales de WhatsApp)

4. **Variables de entorno**:
   - Nunca subas el archivo `.env` al repositorio
   - Usa el gestor de secretos de EasyPanel

## 🔄 Actualizar la Aplicación

```bash
# Pull últimos cambios
git pull origin main

# Rebuild
pnpm install
pnpm run build

# Restart servicios en EasyPanel
docker-compose restart
```

## 📊 Monitoreo

### Logs:
```bash
# Ver logs del API
docker logs -f ventaflow-api

# Ver logs del frontend
docker logs -f ventaflow-web
```

### Health Check:
```bash
curl https://api.tudominio.com/api/health
```

## 🆘 Troubleshooting

### Error de conexión a la base de datos:
- Verifica que la URL de conexión sea correcta
- Asegúrate de usar el host interno en producción
- Revisa que el puerto sea el correcto (5432 interno, 5433 externo)

### WhatsApp no conecta:
- Verifica que el volumen `ventaflow_baileys` esté montado correctamente
- Revisa los logs: `docker logs ventaflow-api`
- Elimina el volumen y vuelve a escanear el QR

### Productos no aparecen:
- Ejecuta el seed: `pnpm --filter @workspace/scripts run seed`
- Verifica que el archivo `scripts/data/products.json` exista

## 🎯 Preparación para SaaS Multi-Tenant

El sistema está preparado para convertirse en SaaS. Para implementar multi-tenancy:

1. **Agregar campo tenant_id a todas las tablas**:
```sql
ALTER TABLE products ADD COLUMN tenant_id TEXT;
ALTER TABLE contacts ADD COLUMN tenant_id TEXT;
-- etc...
```

2. **Crear tabla de tenants**:
```sql
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT UNIQUE,
  database_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

3. **Middleware de tenant**:
   - Detectar tenant por dominio o subdominio
   - Filtrar todas las queries por tenant_id

4. **Aislamiento de datos**:
   - Cada tenant tiene su propia base de datos (opción 1)
   - O todos comparten una base con tenant_id (opción 2)

## 📞 Soporte

Para más ayuda, consulta:
- [Documentación de EasyPanel](https://easypanel.io/docs)
- [Documentación de Drizzle ORM](https://orm.drizzle.team)
- [Baileys WhatsApp](https://github.com/WhiskeySockets/Baileys)
