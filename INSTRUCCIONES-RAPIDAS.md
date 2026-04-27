# 🚀 Instrucciones Rápidas - VentaFlow

## 📋 Estado Actual

✅ **Completado**:
- Sistema actualizado con diseño profesional
- Sistema de categorías implementado
- Configuración 24/7
- Documentación completa
- Preparado para EasyPanel

⚠️ **Pendiente**:
- Instalar Docker Desktop en Windows
- Hacer funcionar localmente
- Subir a GitHub
- Desplegar en EasyPanel

## 🎯 Próximos Pasos (EN ORDEN)

### 1️⃣ Instalar Docker Desktop

**Por qué**: El proyecto tiene un conflicto con esbuild en Windows. Docker es la solución más confiable.

**Cómo**:
1. Descargar: https://www.docker.com/products/docker-desktop/
2. Instalar y reiniciar el PC
3. Abrir Docker Desktop y esperar a que inicie
4. Verificar: `docker --version`

### 2️⃣ Iniciar el Sistema Localmente

```powershell
# En la carpeta del proyecto
cd Openclaw-Automation

# Iniciar servicios
docker-compose up -d

# Esperar 30 segundos a que PostgreSQL inicie
Start-Sleep -Seconds 30

# Migrar base de datos
docker exec ventaflow-api pnpm --filter @workspace/db run push

# Cargar catálogo de 81 productos
docker exec ventaflow-api pnpm --filter @workspace/scripts run seed

# Ver logs
docker-compose logs -f
```

### 3️⃣ Verificar que Funciona

1. **Dashboard**: Abrir http://localhost:8081
2. **API**: Abrir http://localhost:8080/api/health
3. **Productos**: Verificar que aparecen 81 productos en el dashboard

### 4️⃣ Conectar WhatsApp (Opcional para pruebas locales)

1. En el dashboard, ir a **Settings**
2. Click en **Connect WhatsApp**
3. Escanear el QR con WhatsApp
4. Enviar un mensaje de prueba

### 5️⃣ Subir a GitHub

```powershell
# Configurar Git (si no lo has hecho)
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"

# Inicializar repositorio
git init
git add .
git commit -m "feat: Sistema VentaFlow v2.0 con diseño profesional y categorías"

# Conectar con GitHub
git remote add origin https://github.com/daveymena/bot-agente-ventas-r.git

# Subir código
git branch -M main
git push -u origin main --force
```

### 6️⃣ Desplegar en EasyPanel

Ver guía completa en [EASYPANEL-DEPLOY.md](./EASYPANEL-DEPLOY.md)

**Resumen**:
1. Crear base de datos PostgreSQL en EasyPanel
2. Copiar credenciales de conexión
3. Crear nuevo App en EasyPanel
4. Usar `docker-compose.easypanel.yml`
5. Configurar variables de entorno
6. Desplegar

## 📁 Archivos Importantes

- **SETUP-WINDOWS.md** - Guía detallada para Windows
- **EASYPANEL-DEPLOY.md** - Guía de despliegue en producción
- **INSTALL.md** - Troubleshooting y solución de problemas
- **CHANGELOG.md** - Registro de cambios
- **RESUMEN-CAMBIOS.md** - Resumen de lo que se hizo

## 🔧 Comandos Útiles

### Ver logs:
```powershell
docker-compose logs -f ventaflow-api
docker-compose logs -f ventaflow-web
```

### Reiniciar servicios:
```powershell
docker-compose restart
```

### Detener todo:
```powershell
docker-compose down
```

### Limpiar y empezar de nuevo:
```powershell
docker-compose down -v
docker-compose up -d
docker exec ventaflow-api pnpm --filter @workspace/db run push
docker exec ventaflow-api pnpm --filter @workspace/scripts run seed
```

## ❓ ¿Problemas?

### Docker no está instalado
- Instalar Docker Desktop: https://www.docker.com/products/docker-desktop/
- Reiniciar el PC
- Abrir Docker Desktop

### Puerto 8080 o 8081 ocupado
- Cambiar puertos en `docker-compose.yml`:
  ```yaml
  ports:
    - "3000:8080"  # API en puerto 3000
    - "3001:80"    # Web en puerto 3001
  ```

### Base de datos no conecta
- Verificar que Docker Desktop está corriendo
- Esperar 30 segundos después de `docker-compose up`
- Ver logs: `docker-compose logs ventaflow-db`

### No aparecen productos
- Ejecutar seed: `docker exec ventaflow-api pnpm --filter @workspace/scripts run seed`
- Verificar: `docker exec ventaflow-db psql -U ventaflow -d ventaflow -c "SELECT COUNT(*) FROM products;"`

## 📞 Soporte

Si algo no funciona:
1. Revisar [SETUP-WINDOWS.md](./SETUP-WINDOWS.md)
2. Revisar [INSTALL.md](./INSTALL.md)
3. Ver logs: `docker-compose logs -f`

## ✅ Checklist

Antes de subir a GitHub, verificar:

- [ ] Docker Desktop instalado y corriendo
- [ ] `docker-compose up -d` ejecutado sin errores
- [ ] Migraciones ejecutadas correctamente
- [ ] Seed ejecutado (81 productos cargados)
- [ ] Dashboard accesible en http://localhost:8081
- [ ] API responde en http://localhost:8080/api/health
- [ ] Productos visibles en el dashboard
- [ ] (Opcional) WhatsApp conectado y funcionando

Una vez todo funcione localmente:

- [ ] Commit y push a GitHub
- [ ] Crear base de datos en EasyPanel
- [ ] Desplegar en EasyPanel
- [ ] Conectar WhatsApp en producción
- [ ] ¡Sistema funcionando 24/7!

---

**Tiempo estimado**: 30-45 minutos (incluyendo instalación de Docker)

**Siguiente paso**: Instalar Docker Desktop y ejecutar los comandos del paso 2️⃣
