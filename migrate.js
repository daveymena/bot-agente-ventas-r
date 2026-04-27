// Script de migración simple sin dependencias de build
const pg = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:6715320@79.143.187.160:5433/tecnovariedades?sslmode=disable";

const SQL_MIGRATIONS = `
-- Tabla de configuración del bot
CREATE TABLE IF NOT EXISTS bot_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  business_name TEXT NOT NULL DEFAULT 'Mi Negocio',
  welcome_message TEXT NOT NULL DEFAULT '¡Hola! Bienvenido a nuestro servicio. ¿En qué puedo ayudarte hoy?',
  system_prompt TEXT NOT NULL,
  ollama_url TEXT NOT NULL DEFAULT 'https://n8n-ollama.ginee6.easypanel.host',
  ollama_model TEXT NOT NULL DEFAULT 'qwen2.5:1.5b',
  ollama_temperature TEXT NOT NULL DEFAULT '0.7',
  ollama_max_tokens TEXT NOT NULL DEFAULT '512',
  auto_reply BOOLEAN NOT NULL DEFAULT true,
  working_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  working_hours_start VARCHAR(5) DEFAULT '00:00',
  working_hours_end VARCHAR(5) DEFAULT '23:59',
  off_hours_message TEXT,
  allowed_numbers TEXT DEFAULT '',
  payment_methods TEXT DEFAULT 'cash,card,paypal,mercadolibre',
  language TEXT NOT NULL DEFAULT 'es',
  ai_provider TEXT NOT NULL DEFAULT 'ollama',
  ai_api_key TEXT DEFAULT '',
  ai_model TEXT DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  product_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de productos
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  category TEXT,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  tags TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de contactos
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  stage TEXT DEFAULT 'lead',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de conversaciones
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  last_message_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de reglas de automatización
CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  trigger_value TEXT,
  action TEXT NOT NULL,
  action_value TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de memorias
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(contact_id, key)
);

-- Tabla de skills
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  prompt TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de sesiones de agente
CREATE TABLE IF NOT EXISTS agent_sessions (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'greeting',
  context TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON products(in_stock);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_memories_contact_id ON memories(contact_id);
`;

async function migrate() {
  console.log("[VentaFlow] Conectando a la base de datos...");
  console.log(`[VentaFlow] URL: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  
  const client = new pg.Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log("[VentaFlow] ✅ Conectado a PostgreSQL");
    
    console.log("[VentaFlow] Ejecutando migraciones...");
    await client.query(SQL_MIGRATIONS);
    console.log("[VentaFlow] ✅ Migraciones completadas");
    
    // Verificar tablas creadas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log("[VentaFlow] Tablas creadas:");
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    process.exit(0);
  } catch (error) {
    console.error("[VentaFlow] ❌ Error:", error.message);
    process.exit(1);
  }
}

migrate();
