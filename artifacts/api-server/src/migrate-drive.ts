
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Añadiendo columna de entrega automática...");
  try {
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS drive_url TEXT;`);
    console.log("✅ Columna 'drive_url' añadida con éxito.");
  } catch (e) {
    console.error("Error al añadir columna:", e);
  }
  process.exit(0);
}

run();
