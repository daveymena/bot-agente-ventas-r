#!/bin/bash
# =====================================================
# ENTRYPOINT INTELIGENTE - Tecnovariedades D&S
# 
# Modo de operación:
#  - Si GITHUB_TOKEN existe: descarga el último código de GitHub al arrancar.
#    Para actualizar el código = solo REINICIAR el contenedor (segundos).
#  - Si no: usa el código que viene en la imagen (fallback seguro).
# =====================================================

set -e

REPO="daveymena/bot-agente-ventas-r"
BRANCH="${GIT_BRANCH:-main}"
APP_DIR="/app"

echo "🚀 [Entrypoint] Iniciando Tecnovariedades D&S..."

# ── Actualización de código desde GitHub ────────────────────────────
if [ -n "$GITHUB_TOKEN" ]; then
  REPO_URL="https://${GITHUB_TOKEN}@github.com/${REPO}.git"
  
  echo "📥 [Git] Descargando código más reciente desde GitHub..."
  
  if [ -d "$APP_DIR/.git" ]; then
    # Ya tiene repo → solo pull de los cambios
    cd "$APP_DIR"
    git config --global --add safe.directory "$APP_DIR"
    git remote set-url origin "$REPO_URL"
    git fetch origin "$BRANCH" --depth=1
    git reset --hard "origin/$BRANCH"
    echo "✅ [Git] Código actualizado correctamente (pull)"
  else
    # Primera vez → clone completo pero shallow (rápido)
    cd /tmp
    git clone --depth=1 --branch "$BRANCH" "$REPO_URL" app_code
    # Copiar solo los archivos de código (no sobrescribir node_modules)
    rsync -a --exclude=node_modules --exclude=.git /tmp/app_code/ "$APP_DIR/"
    rm -rf /tmp/app_code
    
    # Inicializar git en app para futuros pulls
    cd "$APP_DIR"
    git init
    git remote add origin "$REPO_URL"
    git fetch origin "$BRANCH" --depth=1
    git reset --hard "origin/$BRANCH"
    echo "✅ [Git] Código descargado y listo (clone inicial)"
  fi
else
  echo "⚠️  [Git] GITHUB_TOKEN no encontrado. Usando código de la imagen."
fi

# ── Migración de base de datos ──────────────────────────────────────
echo "🗄️ [DB] Verificando esquema de base de datos..."
cd "$APP_DIR"

# PASO 1: Crear tablas base con Node.js + pg (sin psql)
echo "🔧 [DB] Paso 1: Crear/verificar tablas con Node.js..."
DB_SETUP_SUCCESS=false
if [ -f "$APP_DIR/setup-db.js" ]; then
  if node "$APP_DIR/setup-db.js" 2>&1; then
    echo "✅ [DB] Tablas creadas/verificadas con setup-db.js"
    DB_SETUP_SUCCESS=true
  else
    echo "⚠️ [DB] setup-db.js falló, intentando con drizzle..."
  fi
else
  echo "⚠️ setup-db.js no encontrado"
fi

# PASO 2: Intentar migración con drizzle SOLO si setup-db.js falló
if [ "$DB_SETUP_SUCCESS" != "true" ]; then
  echo "🔧 [DB] Paso 2: Sincronizar esquema con drizzle..."
  DB_RETRIES=2
  for i in $(seq 1 $DB_RETRIES); do
    echo "📊 [DB] Intento $i/$DB_RETRIES de migración..."
    if pnpm --filter @workspace/db run push 2>&1 | tee /tmp/db_migration.log; then
      echo "✅ [DB] Esquema actualizado/creado correctamente"
      break
    else
      if [ $i -lt $DB_RETRIES ]; then
        echo "⚠️ [DB] Intento $i falló, reintentando en 5 segundos..."
        sleep 5
      else
        echo "⚠️ [DB] Migración fallida después de $DB_RETRIES intentos"
        echo "📝 [DB] Logs:"
        cat /tmp/db_migration.log || true
        echo "⚠️ [DB] Continuando de todos modos (las tablas podrían estar listas)..."
      fi
    fi
  done
else
  echo "✅ [DB] Omitiendo drizzle-kit (setup-db.js fue exitoso)"
fi

# ── Cargar datos iniciales (productos) ─────────────────────────────
echo "📦 [Seed] Cargando catálogo de productos..."
cd "$APP_DIR"

if [ -f "$APP_DIR/scripts/data/products.json" ]; then
  echo "📥 [Seed] Archivo products.json encontrado ($(wc -c < "$APP_DIR/scripts/data/products.json") bytes)"
  
  # Limpiar tabla de productos y volver a cargar (asegura 81 productos)
  echo "📊 [Seed] Limpiando tabla products (si existe)..."
  node -e "
    const pg = require('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, statement_timeout: 10000 });
    (async () => {
      try {
        await pool.query('DELETE FROM products');
        console.log('✅ Tabla products limpiada');
      } catch (err) {
        console.log('⚠️ No se pudo limpiar (tabla quizás no existe)');
      }
      pool.end();
    })();
  " 2>/dev/null || true
  
  echo "📥 [Seed] Cargando catálogo de productos..."
  for i in $(seq 1 2); do
    if pnpm --filter @workspace/scripts run seed 2>&1; then
      echo "✅ [Seed] Catálogo cargado exitosamente"
      break
    else
      if [ $i -lt 2 ]; then
        echo "⚠️ [Seed] Intento $i falló, reintentando en 3 segundos..."
        sleep 3
      else
        echo "⚠️ [Seed] Error al cargar productos después de 2 intentos"
        echo "📝 [Seed] Verificando por qué falló..."
        node "$APP_DIR/test-db.js" 2>&1 | head -20 || true
      fi
    fi
  done
else
  echo "❌ [Seed] No se encontró products.json en $APP_DIR/scripts/data/"
fi

# ── Arrancar el servidor ──────────────────────────────────────────
echo "🟢 [Server] Arrancando API en puerto ${PORT:-8080}..."
cd "$APP_DIR/artifacts/api-server"
exec node --import tsx/esm src/index.ts
