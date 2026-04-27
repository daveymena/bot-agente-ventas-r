
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Limpiando tabla 'messages'...");
  try {
    // Eliminar columnas obsoletas que bloquean la inserción
    await db.execute(sql`ALTER TABLE messages DROP COLUMN IF EXISTS sender`);
    await db.execute(sql`ALTER TABLE messages DROP COLUMN IF EXISTS message_type`);
    await db.execute(sql`ALTER TABLE messages DROP COLUMN IF EXISTS metadata`);
    
    console.log("✅ Columnas obsoletas eliminadas de 'messages'.");
    
    // Asegurar que las columnas correctas sean NOT NULL
    await db.execute(sql`ALTER TABLE messages ALTER COLUMN conversation_id SET NOT NULL`);
    await db.execute(sql`ALTER TABLE messages ALTER COLUMN content SET NOT NULL`);
    await db.execute(sql`ALTER TABLE messages ALTER COLUMN direction SET NOT NULL`);
    
    console.log("🚀 TABLA MESSAGES LIMPIA Y COMPATIBLE.");
  } catch (e: any) {
    console.error("❌ Error reparando tabla messages:", e.message);
  }
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
