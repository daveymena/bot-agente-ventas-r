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
if pnpm --filter @workspace/db run push 2>&1; then
  echo "✅ [DB] Esquema actualizado/creado correctamente"
else
  echo "⚠️ [DB] Error en migración, intentando continuar..."
fi

# ── Cargar datos iniciales (productos) ─────────────────────────────
echo "📦 [Seed] Verificando catálogo de productos..."

# Verificar si ya hay productos (evitar duplicados)
echo "📊 [Seed] Consultando productos existentes..."
cd "$APP_DIR"
PRODUCT_COUNT=$(node -e "
const { drizzle } = require('drizzle-orm');
const { pg } = require('drizzle-orm/pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });
db.execute('SELECT COUNT(*) as count FROM products')
  .then(r => { console.log(r[0]?.count || '0'); pool.end(); })
  .catch(() => { console.log('0'); pool.end(); });
" 2>/dev/null || echo "0")

echo "📊 [Seed] Productos existentes: $PRODUCT_COUNT"

if [ "$PRODUCT_COUNT" = "0" ] && [ -f "$APP_DIR/scripts/data/products.json" ]; then
  echo "📥 [Seed] Cargando catálogo de productos..."
  cd "$APP_DIR"
  pnpm --filter @workspace/scripts run seed 2>&1 || echo "⚠️ [Seed] Error al cargar productos, ver logs arriba"
else
  echo "✅ [Seed] Catálogo ya cargado o no se encontró products.json"
fi

# ── Arrancar el servidor ──────────────────────────────────────────
echo "🟢 [Server] Arrancando API en puerto ${PORT:-8080}..."
cd "$APP_DIR/artifacts/api-server"
exec node --import tsx/esm src/index.ts
