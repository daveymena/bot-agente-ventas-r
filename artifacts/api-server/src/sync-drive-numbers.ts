
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { productsTable } from "@workspace/db/schema";
import fs from "fs";
import path from "path";

async function run() {
  console.log("Iniciando migración de Drive...");
  try {
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS drive_number INTEGER;`);
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS drive_url TEXT;`);
    
    // Cargar JSON para sincronizar números
    const jsonPath = path.resolve(process.cwd(), "../../scripts/data/products.json");
    const productsJson = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    
    console.log("Sincronizando números de Drive desde JSON...");
    for (const p of productsJson) {
      await db.update(productsTable)
        .set({ driveNumber: p.numero_drive })
        .where(sql`name = ${p.titulo_comercial}`);
    }
    
    console.log("✅ Sincronización completada.");
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

run();
