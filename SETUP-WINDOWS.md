# 🪟 Guía de Configuración para Windows

## ⚠️ Problema Actual

El proyecto tiene un conflicto con esbuild en Windows que impide la compilación directa. La solución más confiable es usar **Docker Desktop**.

## 📦 Opción 1: Docker Desktop (Recomendado)

### Paso 1: Instalar Docker Desktop

1. Descargar Docker Desktop para Windows:
   - https://www.docker.com/products/docker-desktop/

2. Ejecutar el instalador y seguir las instrucciones

3. Reiniciar el computador si es necesario

4. Abrir Docker Desktop y esperar a que inicie

5. Verificar instalación:
   ```powershell
   docker --version
   docker-compose --version
   ```

### Paso 2: Configurar el Proyecto

1. Abrir PowerShell en la carpeta del proyecto

2. Copiar el archivo de entorno:
   ```powershell
   Copy-Item .env.example .env
   ```

3. Editar `.env` y cambiar `NODE_ENV` a `development`:
   ```env
   NODE_ENV=development
   PORT=8080
   DATABASE_URL=postgresql://ventaflow:ventaflow_secret@ventaflow-db:5432/ventaflow
   ```

### Paso 3: Iniciar el Sistema

```powershell
# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Esperar a que PostgreSQL esté listo (30 segundos aprox)
Start-Sleep -Seconds 30

# Ejecutar migraciones
docker exec ventaflow-api pnpm --filter @workspace/db run push

# Cargar catálogo de productos
docker exec ventaflow-api pnpm --filter @workspace/scripts run seed
```

### Paso 4: Acceder al Sistema

- **Dashboard**: http://localhost:8081
- **API**: http://localhost:8080
- **Base de datos**: localhost:5432

### Paso 5: Conectar WhatsApp

1. Abrir http://localhost:8081
2. Ir a **Settings** → **Connect WhatsApp**
3. Escanear el código QR con WhatsApp
4. ¡Listo! El bot está funcionando

## 📦 Opción 2: WSL2 (Alternativa)

Si prefieres no usar Docker Desktop:

### Paso 1: Instalar WSL2

```powershell
# En PowerShell como Administrador
wsl --install
```

### Paso 2: Instalar Ubuntu

```powershell
wsl --install -d Ubuntu
```

### Paso 3: Configurar en Ubuntu

```bash
# Dentro de WSL2/Ubuntu
cd /mnt/c/Users/ADMIN/Downloads/Openclaw-Automation/Openclaw-Automation

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar pnpm
npm install -g pnpm

# Instalar PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Iniciar PostgreSQL
sudo service postgresql start

# Crear base de datos
sudo -u postgres psql -c "CREATE USER ventaflow WITH PASSWORD 'ventaflow_secret';"
sudo -u postgres psql -c "CREATE DATABASE ventaflow OWNER ventaflow;"

# Instalar dependencias
pnpm install

# Configurar .env
cp .env.example .env
# Editar .env y cambiar DATABASE_URL a:
# DATABASE_URL=postgresql://ventaflow:ventaflow_secret@localhost:5432/ventaflow

# Migrar base de datos
pnpm --filter @workspace/db run push

# Cargar catálogo
pnpm --filter @workspace/scripts run seed

# Iniciar backend
pnpm --filter @workspace/api-server run dev &

# Iniciar frontend
pnpm --filter @workspace/whatsapp-bot run dev
```

## 📦 Opción 3: PostgreSQL Local (Avanzado)

### Paso 1: Instalar PostgreSQL

1. Descargar PostgreSQL para Windows:
   - https://www.postgresql.org/download/windows/

2. Instalar con las opciones por defecto

3. Recordar la contraseña del usuario `postgres`

### Paso 2: Crear Base de Datos

```powershell
# Abrir psql
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres

# En psql:
CREATE USER ventaflow WITH PASSWORD 'ventaflow_secret';
CREATE DATABASE ventaflow OWNER ventaflow;
\q
```

### Paso 3: Configurar el Proyecto

```powershell
# Copiar .env
Copy-Item .env.example .env

# Editar .env y cambiar:
# DATABASE_URL=postgresql://ventaflow:ventaflow_secret@localhost:5432/ventaflow
# NODE_ENV=development
```

### Paso 4: Instalar Dependencias (Sin Build)

El problema de esbuild se puede evitar ejecutando en modo desarrollo:

```powershell
# Instalar dependencias (ignorar error de esbuild)
pnpm install 2>$null

# Migrar base de datos
$env:DATABASE_URL="postgresql://ventaflow:ventaflow_secret@localhost:5432/ventaflow"
pnpm --filter @workspace/db run push

# Cargar catálogo
pnpm --filter @workspace/scripts run seed

# Iniciar backend en modo desarrollo (no requiere build)
pnpm --filter @workspace/api-server run dev
```

En otra terminal:

```powershell
# Iniciar frontend
pnpm --filter @workspace/whatsapp-bot run dev
```

## ✅ Verificación

### Backend funcionando:
```powershell
curl http://localhost:8080/api/health
```

Debe responder: `{"status":"ok"}`

### Frontend funcionando:
Abrir http://localhost:5173 en el navegador

### Base de datos funcionando:
```powershell
# Con PostgreSQL local
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U ventaflow -d ventaflow -c "SELECT COUNT(*) FROM products;"

# Con Docker
docker exec ventaflow-db psql -U ventaflow -d ventaflow -c "SELECT COUNT(*) FROM products;"
```

Debe mostrar 81 productos

## 🐛 Troubleshooting

### Error: "Cannot connect to database"
- Verificar que PostgreSQL esté corriendo
- Verificar la URL en `.env`
- Probar conexión: `psql $env:DATABASE_URL`

### Error: "Port 8080 already in use"
- Cerrar otras aplicaciones en ese puerto
- O cambiar el puerto en `.env`: `PORT=3000`

### Error: "esbuild version mismatch"
- Usar Docker (Opción 1)
- O ejecutar en modo desarrollo sin build

### Error: "pnpm: command not found"
```powershell
npm install -g pnpm
```

## 📝 Comandos Útiles

### Docker
```powershell
# Ver servicios corriendo
docker-compose ps

# Ver logs
docker-compose logs -f ventaflow-api

# Reiniciar servicios
docker-compose restart

# Detener todo
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v
```

### Desarrollo
```powershell
# Reinstalar dependencias
Remove-Item -Recurse -Force node_modules
pnpm install

# Limpiar base de datos
pnpm --filter @workspace/db run push --force

# Recargar catálogo
pnpm --filter @workspace/scripts run seed
```

## 🎯 Recomendación

**Para desarrollo en Windows, usa Docker Desktop (Opción 1)**. Es la forma más confiable y evita todos los problemas de compatibilidad.

Una vez que Docker Desktop esté instalado, solo necesitas:

```powershell
docker-compose up -d
docker exec ventaflow-api pnpm --filter @workspace/db run push
docker exec ventaflow-api pnpm --filter @workspace/scripts run seed
```

Y listo, todo funcionará perfectamente.

---

**Siguiente paso**: Una vez funcionando localmente, subiremos a GitHub y desplegaremos en EasyPanel.
