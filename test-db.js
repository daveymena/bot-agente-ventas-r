#!/usr/bin/env node
/**
 * Test DB connection and log table status
 */

const pg = require('pg');
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:6715320@79.143.187.160:5433/tecnovariedades?sslmode=disable";

async function testDB() {
  console.log('🔧 [DB-Test] Testing database connection...');
  console.log(`URL: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`); // Hide password
  
  const pool = new Pool({ connectionString: DATABASE_URL, statement_timeout: 10000 });
  
  try {
    // Test connection
    const result = await pool.query('SELECT NOW() as now');
    console.log('✅ [DB-Test] Connection successful:', result.rows[0].now);
    
    // Check if tables exist
    const tables = ['products', 'conversations', 'messages', 'bot_config', 'contacts'];
    for (const table of tables) {
      try {
        const res = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
        console.log(`✅ [DB-Test] Table "${table}" exists: ${res.rows[0].count} rows`);
      } catch (err) {
        console.log(`❌ [DB-Test] Table "${table}" missing: ${err.message.split('\n')[0]}`);
      }
    }
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ [DB-Test] Connection failed:', err.message);
    await pool.end();
    process.exit(1);
  }
}

testDB();
