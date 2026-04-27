# 📦 Guía de Instalación y Verificación

## ⚠️ Problema Conocido: esbuild

Actualmente hay un conflicto con la versión de esbuild en Windows. Para solucionarlo:

### Solución 1: Usar Docker (Recomendado)

```bash
# Copiar archivo de entorno
cp .env.example .env

# Editar .env con tus credenciales
# Especialmente DATABASE_URL

# Iniciar con Docker
docker-compose up -d

# Ejecutar migraciones
docker exec ventaflow-api pnpm --filter @workspace/db run push

# Cargar catálogo
docker exec ventaflow-api pnpm --filter @workspace/scripts run seed
```

### Solución 2: Desarrollo Local (Linux/Mac)

```bash
# Instalar dependencias
pnpm install

# Migrar base de datos
pnpm --filter @workspace/db run push

# Cargar catálogo
pnpm --filter @workspace/scripts run seed

# Iniciar backend
pnpm --filter @workspace/api-server run dev

# En otra terminal, iniciar frontend
pnpm --filter @workspace/whatsapp-bot run dev
```

### Solución 3: Build Manual (Windows)

Si tienes problemas con esbuild en Windows:

```bash
# Limpiar caché de pnpm
pnpm store prune

# Eliminar node_modules global de esbuild
Remove-Item -Recurse -Force $env:LOCALAPPDATA\pnpm\store\v3\files\*esbuild*

# Reinstalar
pnpm install --force

# Si persiste, usar WSL2 o Docker
```

## ✅ Verificación del Sistema

### 1. Base de Datos

```bash
# Verificar conexión a PostgreSQL
psql $DATABASE_URL -c "SELECT version();"

# Ver tablas creadas
psql $DATABASE_URL -c "\dt"
```

### 2. Backend API

```bash
# Verificar que el API responde
curl http://localhost:8080/api/health

# Ver productos
curl http://localhost:8080/api/products
```

### 3. Frontend

Abrir en el navegador: `http://localhost:5173` (desarrollo) o `http://localhost:8081` (producción)

### 4. WhatsApp Bot

1. Ir a Settings → Connect WhatsApp
2. Escanear el código QR con WhatsApp
3. Enviar un mensaje de prueba al número conectado

## 🔧 Configuración 24/7

El sistema está configurado para funcionar 24/7 por defecto:

- `workingHoursEnabled: false` - Deshabilitado = siempre activo
- `autoReply: true` - Respuestas automáticas habilitadas
- El bot responderá a cualquier hora del día

Para cambiar esto, edita la configuración en el dashboard:
- Settings → Bot Configuration → Working Hours

## 🚀 Despliegue en Producción

### EasyPanel

```bash
# Usar el docker-compose específico para EasyPanel
docker-compose -f docker-compose.easypanel.yml up -d

# Configurar variables de entorno en EasyPanel
# DATABASE_URL debe apuntar a la base de datos de EasyPanel
```

Ver [EASYPANEL-DEPLOY.md](./EASYPANEL-DEPLOY.md) para más detalles.

## 📊 Monitoreo

### Logs

```bash
# Docker
docker logs -f ventaflow-api
docker logs -f ventaflow-web

# Desarrollo
# Los logs aparecen en la terminal donde ejecutaste pnpm run dev
```

### Health Check

```bash
# API
curl http://localhost:8080/api/health

# Base de datos
curl http://localhost:8080/api/products | jq '.products | length'
```

## 🐛 Troubleshooting

### Error: Cannot connect to database

- Verifica que PostgreSQL esté corriendo
- Verifica la variable `DATABASE_URL` en `.env`
- Prueba la conexión: `psql $DATABASE_URL`

### Error: WhatsApp no conecta

- Verifica que el volumen `ventaflow_baileys` esté montado
- Elimina el volumen y vuelve a escanear el QR:
  ```bash
  docker volume rm ventaflow_baileys
  docker-compose restart ventaflow-api
  ```

### Error: No products found

- Ejecuta el seed:
  ```bash
  pnpm --filter @workspace/scripts run seed
  # o en Docker:
  docker exec ventaflow-api pnpm --filter @workspace/scripts run seed
  ```

### Error: esbuild version mismatch (Windows)

- Usa Docker en su lugar
- O usa WSL2 para desarrollo
- O espera a que se corrija el conflicto de versiones

## 📝 Próximos Pasos

1. ✅ Instalar dependencias
2. ✅ Configurar base de datos
3. ✅ Ejecutar migraciones
4. ✅ Cargar catálogo
5. ✅ Conectar WhatsApp
6. ✅ Probar el sistema
7. 🚀 Desplegar en producción
8. 📊 Monitorear y optimizar

## 🔗 Enlaces Útiles

- [README.md](./README.md) - Documentación principal
- [EASYPANEL-DEPLOY.md](./EASYPANEL-DEPLOY.md) - Guía de despliegue
- [.env.example](./.env.example) - Variables de entorno
- [GitHub](https://github.com/daveymena/bot-agente-ventas-r.git) - Repositorio
