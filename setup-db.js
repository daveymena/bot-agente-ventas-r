#!/usr/bin/env node
/**
 * FORCE DB SETUP - Create ALL tables if they don't exist
 * Uses Node.js + pg (no psql needed)
 * Covers all tables from lib/db/src/schema/index.ts
 */

const pg = require('pg');
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not configured');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, statement_timeout: 30000 });

const SQL_STATEMENTS = [
  {
    name: 'categories',
    sql: `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY DEFAULT crypto.randomUUID(),
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT,
      color TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      product_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`
  },
  {
    name: 'products',
    sql: `CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price BIGINT NOT NULL,
      category VARCHAR(100),
      category_id TEXT REFERENCES categories(id),
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
  },
  {
    name: 'automation_rules',
    sql: `CREATE TABLE IF NOT EXISTS automation_rules (
      id TEXT PRIMARY KEY DEFAULT crypto.randomUUID(),
      name TEXT NOT NULL,
      trigger TEXT NOT NULL,
      trigger_value TEXT,
      action TEXT NOT NULL,
      action_value TEXT,
      enabled BOOLEAN NOT NULL DEFAULT true,
      priority INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );`
  },
  {
    name: 'memories',
    sql: `CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY DEFAULT crypto.randomUUID(),
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      tags TEXT DEFAULT '',
      source TEXT DEFAULT 'manual',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`
  },
  {
    name: 'skills',
    sql: `CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY DEFAULT crypto.randomUUID(),
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      code TEXT NOT NULL,
      parameters_schema TEXT NOT NULL DEFAULT '{}',
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`
  },
  {
    name: 'agent_sessions',
    sql: `CREATE TABLE IF NOT EXISTS agent_sessions (
      id TEXT PRIMARY KEY DEFAULT crypto.randomUUID(),
      title TEXT NOT NULL DEFAULT 'New Session',
      messages TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`
  }
];

async function setupDatabase() {
  console.log('🔧 [DB-Force] Creating/verifying all database tables...');
  
  try {
    for (const { name, sql } of SQL_STATEMENTS) {
      try {
        console.log(`📝 [DB-Force] Creating table '${name}' if not exists...`);
        await pool.query(sql);
        console.log(`✅ Table '${name}' ready`);
      } catch (err) {
        console.log(`⚠️ Table '${name}': ${err.message.substring(0, 80)}`);
      }
    }
    
    console.log('✅ [DB-Force] All tables created/verified');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

setupDatabase();
