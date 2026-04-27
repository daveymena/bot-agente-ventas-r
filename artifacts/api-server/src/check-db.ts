
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Auditoría técnica de 'messages'...");
  try {
    const res = await db.execute(sql`
      SELECT column_name, is_nullable, column_default, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'messages'
    `);
    console.table(res.rows);
  } catch (e: any) {
    console.log("❌ Error:", e.message);
  }
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
