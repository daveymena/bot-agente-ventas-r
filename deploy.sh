#!/bin/bash

# Script de despliegue para VentaFlow
# Uso: ./deploy.sh [local|easypanel]

set -e

MODE=${1:-local}

echo "🚀 VentaFlow - Script de Despliegue"
echo "===================================="
echo ""

if [ "$MODE" = "local" ]; then
    echo "📦 Modo: Desarrollo Local"
    echo ""
    
    # Verificar que existe .env
    if [ ! -f .env ]; then
        echo "⚠️  No se encontró .env, copiando desde .env.example..."
        cp .env.example .env
        echo "✅ Archivo .env creado. Por favor, configura tus credenciales."
        exit 1
    fi
    
    echo "📥 Instalando dependencias..."
    pnpm install
    
    echo "🗄️  Migrando base de datos..."
    pnpm --filter @workspace/db run push
    
    echo "🌱 Cargando catálogo de productos..."
    pnpm --filter @workspace/scripts run seed
    
    echo "🏗️  Compilando proyecto..."
    pnpm run build
    
    echo "🐳 Iniciando servicios con Docker Compose..."
    docker-compose up -d
    
    echo ""
    echo "✅ Despliegue local completado!"
    echo ""
    echo "📊 Dashboard: http://localhost:8081"
    echo "🔌 API: http://localhost:8080"
    echo ""
    echo "Para ver logs:"
    echo "  docker-compose logs -f"
    
elif [ "$MODE" = "easypanel" ]; then
    echo "☁️  Modo: EasyPanel (Producción)"
    echo ""
    
    # Verificar que existe .env.easypanel
    if [ ! -f .env.easypanel ]; then
        echo "⚠️  No se encontró .env.easypanel"
        echo "Por favor, crea el archivo con la configuración de tu base de datos de EasyPanel."
        exit 1
    fi
    
    # Copiar .env.easypanel a .env
    cp .env.easypanel .env
    
    echo "📥 Instalando dependencias..."
    pnpm install
    
    echo "🏗️  Compilando proyecto..."
    pnpm run build
    
    echo "🐳 Iniciando servicios con Docker Compose (EasyPanel)..."
    docker-compose -f docker-compose.easypanel.yml up -d
    
    echo ""
    echo "⏳ Esperando que los servicios estén listos..."
    sleep 10
    
    echo "🗄️  Migrando base de datos..."
    docker exec ventaflow-api pnpm --filter @workspace/db run push
    
    echo "🌱 Cargando catálogo de productos..."
    docker exec ventaflow-api pnpm --filter @workspace/scripts run seed
    
    echo ""
    echo "✅ Despliegue en EasyPanel completado!"
    echo ""
    echo "📊 Configura tu dominio en EasyPanel para acceder al dashboard"
    echo "🔌 API estará disponible en el puerto 8080"
    echo ""
    echo "Para ver logs:"
    echo "  docker logs -f ventaflow-api"
    echo "  docker logs -f ventaflow-web"
    
else
    echo "❌ Modo no válido: $MODE"
    echo ""
    echo "Uso: ./deploy.sh [local|easypanel]"
    echo ""
    echo "Modos disponibles:"
    echo "  local      - Despliegue local con base de datos Docker"
    echo "  easypanel  - Despliegue en EasyPanel con base de datos externa"
    exit 1
fi

echo ""
echo "🎉 ¡Listo! Tu sistema VentaFlow está funcionando."
echo ""
echo "Próximos pasos:"
echo "1. Accede al dashboard"
echo "2. Ve a Settings → Connect WhatsApp"
echo "3. Escanea el código QR con tu WhatsApp"
echo "4. ¡Comienza a vender!"
