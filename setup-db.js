#!/usr/bin/env node
/**
 * FORCE DB SETUP - Crear tablas si no existen
 * Se ejecuta ANTES del API server en EasyPanel
 * Usa Node.js + pg client (disponible en todos lados)
 */

const pg = require('pg');
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurado');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, statement_timeout: 30000 });

const SQL_STATEMENTS = [
  {
    name: 'products',
    sql: `CREATE TABLE IF NOT EXISTS products (
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
    );`
  },
  {
    name: 'conversations',
    sql: `CREATE TABLE IF NOT EXISTS conversations (
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
    );`
  },
  {
    name: 'messages',
    sql: `CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      direction VARCHAR(20),
      ai_generated BOOLEAN DEFAULT false,
      status VARCHAR(50),
      timestamp TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );`
  },
  {
    name: 'bot_config',
    sql: `CREATE TABLE IF NOT EXISTS bot_config (
      id VARCHAR(100) PRIMARY KEY,
      auto_reply BOOLEAN DEFAULT true,
      ai_provider VARCHAR(50) DEFAULT 'github',
      ai_model VARCHAR(100) DEFAULT 'gpt-4o-mini',
      ai_api_key VARCHAR(500),
      system_prompt TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`
  },
  {
    name: 'contacts',
    sql: `CREATE TABLE IF NOT EXISTS contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(255),
      email VARCHAR(255),
      tags TEXT,
      notes TEXT,
      stage VARCHAR(100),
      total_purchases INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`
  }
];

async function setupDatabase() {
  console.log('🔧 [DB-Force] Verificando y creando tablas si es necesario...');
  
  try {
    for (const { name, sql } of SQL_STATEMENTS) {
      try {
        console.log(`📝 [DB-Force] Creando tabla '${name}' si no existe...`);
        await pool.query(sql);
        console.log(`✅ Tabla '${name}' lista`);
      } catch (err) {
        console.log(`⚠️ Tabla '${name}': ${err.message.substring(0, 60)}`);
      }
    }
    
    console.log('✅ [DB-Force] Tablas base creadas/verificadas');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fatal:', err.message);
    await pool.end();
    process.exit(1);
  }
}

setupDatabase();
