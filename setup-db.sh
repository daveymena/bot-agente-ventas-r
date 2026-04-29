#!/bin/bash
# =====================================================
# FORCE DB SETUP - Crear tablas si no existen
# Se ejecuta ANTES del API server en EasyPanel
# =====================================================

set -e

echo "🔧 [DB-Force] Verificando y creando tablas si es necesario..."

DATABASE_URL="${DATABASE_URL:-}"
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL no está configurado"
  exit 1
fi

# Usar psql directamente para crear las tablas base
# Esto se ejecuta INCLUSO si drizzle-kit falla

echo "📝 [DB-Force] Creando tabla 'products' si no existe..."
psql "$DATABASE_URL" -c "
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price BIGINT NOT NULL,
  category VARCHAR(100),
  category_id UUID,
  in_stock BOOLEAN DEFAULT true,
  image_url VARCHAR(500),
  featured BOOLEAN DEFAULT false,
  tags TEXT,
  drive_number VARCHAR(100),
  drive_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
" 2>&1 || echo "⚠️ Tabla 'products' ya existe"

echo "📝 [DB-Force] Creando tabla 'conversations' si no existe..."
psql "$DATABASE_URL" -c "
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_phone VARCHAR(20) NOT NULL,
  contact_name VARCHAR(255),
  last_message TEXT,
  last_message_at TIMESTAMP,
  status VARCHAR(50),
  unread_count INTEGER DEFAULT 0,
  ai_handled BOOLEAN DEFAULT false,
  sales_stage VARCHAR(100),
  total_messages INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
" 2>&1 || echo "⚠️ Tabla 'conversations' ya existe"

echo "📝 [DB-Force] Creando tabla 'messages' si no existe..."
psql "$DATABASE_URL" -c "
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  direction VARCHAR(20),
  ai_generated BOOLEAN DEFAULT false,
  status VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
" 2>&1 || echo "⚠️ Tabla 'messages' ya existe"

echo "📝 [DB-Force] Creando tabla 'bot_config' si no existe..."
psql "$DATABASE_URL" -c "
CREATE TABLE IF NOT EXISTS bot_config (
  id VARCHAR(100) PRIMARY KEY,
  auto_reply BOOLEAN DEFAULT true,
  ai_provider VARCHAR(50) DEFAULT 'github',
  ai_model VARCHAR(100) DEFAULT 'gpt-4o-mini',
  ai_api_key VARCHAR(500),
  system_prompt TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
" 2>&1 || echo "⚠️ Tabla 'bot_config' ya existe"

echo "✅ [DB-Force] Tablas base creadas/verificadas"
