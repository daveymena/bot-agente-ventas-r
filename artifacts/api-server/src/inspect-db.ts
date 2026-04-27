
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Revisando columnas de 'messages'...");
  const result = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'messages';
  `);
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
