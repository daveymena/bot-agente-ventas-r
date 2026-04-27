#!/bin/bash
# =====================================================
# PUSH A GITHUB DESDE LA CONSOLA DE EASYPANEL
# Uso: /app/push.sh "descripción del cambio"
# =====================================================

set -e

COMMIT_MSG="${1:-"update: mejoras desde consola Easypanel"}"
REPO="daveymena/bot-agente-ventas-r"
BRANCH="main"

# Verificar token
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ ERROR: Variable GITHUB_TOKEN no encontrada."
  echo "   Asegúrate de tenerla en las variables de entorno de Easypanel."
  exit 1
fi

REPO_URL="https://${GITHUB_TOKEN}@github.com/${REPO}.git"

cd /app

echo "🔧 Inicializando repositorio git..."
if [ ! -d ".git" ]; then
  git init
  git remote add origin "$REPO_URL"
  # Traer historial para que el push no sea huérfano
  git fetch origin "$BRANCH" --depth=1
  git reset origin/"$BRANCH" --soft
else
  git remote set-url origin "$REPO_URL"
fi

git config user.email "daveymena16@gmail.com"
git config user.name "Davey Mena"
git config --global --add safe.directory /app

echo "📦 Agregando todos los cambios..."
git add -A

echo "💾 Haciendo commit: '$COMMIT_MSG'"
if git diff --cached --quiet; then
  echo "⚠️  No hay cambios nuevos para commitear."
else
  git commit -m "$COMMIT_MSG"

  echo "🚀 Subiendo a GitHub (rama $BRANCH)..."
  git push -u origin "$BRANCH"

  echo ""
  echo "✅ ¡Cambios subidos exitosamente a GitHub!"
  echo "   Repo: https://github.com/$REPO"
  echo "   👉 Ve a Easypanel y presiona 'Deploy' para aplicar los cambios al servidor."
fi
