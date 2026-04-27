
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Iniciando MEGA-Sincronización de Postgres...");
  try {
    // 1. Tabla CONTACTS
    await db.execute(sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'lead'`);
    await db.execute(sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS total_purchases integer NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes text`);
    await db.execute(sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tags text DEFAULT ''`);
    
    // 2. Tabla MESSAGES
    try { await db.execute(sql`ALTER TABLE messages RENAME COLUMN created_at TO timestamp`); } catch(e) {}
    await db.execute(sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS timestamp timestamp NOT NULL DEFAULT now()`);
    await db.execute(sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'inbound'`);
    await db.execute(sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false`);
    await db.execute(sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent'`);
    await db.execute(sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id text`);
    
    // 3. Tabla CONVERSATIONS
    await db.execute(sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS contact_phone text`);
    await db.execute(sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS contact_name text`);
    await db.execute(sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message text`);
    await db.execute(sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at timestamp`);
    await db.execute(sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'`);
    await db.execute(sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count integer NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_handled boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sales_stage text NOT NULL DEFAULT 'welcome'`);
    await db.execute(sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS total_messages integer NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now()`);

    // 4. Tabla BOT_CONFIG
    await db.execute(sql`ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS ai_provider text`);
    await db.execute(sql`ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS ai_model text`);
    await db.execute(sql`ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS ai_api_key text`);
    await db.execute(sql`ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS system_prompt text`);
    await db.execute(sql`ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS auto_reply boolean DEFAULT false`);

    console.log("✅ MEGA-SINCRONIZACIÓN EXITOSA. Todas las columnas están presentes.");
  } catch (e: any) {
    console.error("❌ Error en mega-sincronización:", e.message);
  }
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
