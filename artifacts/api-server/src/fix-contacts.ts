
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Normalizando tabla 'contacts'...");
  try {
    await db.execute(sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS total_purchases integer NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'lead'`);
    await db.execute(sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes text`);
    await db.execute(sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tags text DEFAULT ''`);
    console.log("🚀 TABLA CONTACTS NORMALIZADA.");
  } catch (e: any) {
    console.error("❌ Error:", e.message);
  }
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
