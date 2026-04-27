#!/bin/bash
# =====================================================
# SCRIPT DE PUSH A GITHUB DESDE LA CONSOLA DE EASYPANEL
# Uso: ./push.sh "descripción del cambio"
# =====================================================

set -e

COMMIT_MSG="${1:-"update: mejoras desde consola Easypanel"}"
REPO_URL="https://${GITHUB_TOKEN}@github.com/daveymena/bot-agente-ventas-r.git"

echo "🔧 Configurando Git..."
git config user.email "daveymena16@gmail.com"
git config user.name "Davey Mena"
git config --global --add safe.directory /app

# Si no hay remote configurado, lo agrega
if ! git remote get-url origin &>/dev/null; then
  echo "🔗 Configurando remote origin..."
  git remote add origin "$REPO_URL"
else
  # Actualiza el remote con el token actual (por si cambió)
  git remote set-url origin "$REPO_URL"
fi

cd /app

echo "📦 Agregando cambios..."
git add -A

echo "💾 Haciendo commit: '$COMMIT_MSG'"
git commit -m "$COMMIT_MSG" || echo "⚠️  Nada nuevo que commitear."

echo "🚀 Subiendo a GitHub..."
git push -u origin main

echo ""
echo "✅ ¡Listo! Cambios subidos a GitHub."
echo "   Easypanel actualizará automáticamente si tienes webhooks activos."
echo "   Si no, ve a Easypanel y dale a 'Deploy' para aplicar los cambios."
