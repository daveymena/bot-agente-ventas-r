
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Iniciando REPARACIÓN ESTRUCTURAL de 'conversations'...");
  try {
    // 1. Eliminar la columna que bloquea (contact_id) si existe
    try {
      await db.execute(sql`ALTER TABLE conversations DROP COLUMN IF EXISTS contact_id`);
      console.log("✅ Columna obsoleta 'contact_id' eliminada.");
    } catch(e) { console.log("Nota: No se pudo eliminar contact_id o no existía."); }

    // 2. Corregir contact_phone (debe ser NOT NULL)
    await db.execute(sql`ALTER TABLE conversations ALTER COLUMN contact_phone SET NOT NULL`);
    console.log("✅ 'contact_phone' ahora es NOT NULL.");

    // 3. Asegurar que todas las columnas del esquema actual existan con sus defaults
    await db.execute(sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count integer NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_handled boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sales_stage text NOT NULL DEFAULT 'welcome'`);
    await db.execute(sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS total_messages integer NOT NULL DEFAULT 0`);
    
    console.log("🚀 TABLA CONVERSATIONS REPARADA Y COMPATIBLE.");
  } catch (e: any) {
    console.error("❌ Error reparando tabla:", e.message);
  }
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
