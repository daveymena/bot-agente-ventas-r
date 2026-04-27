
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Limpiando duplicados...");
  try {
    await db.execute(sql`DELETE FROM products WHERE id NOT IN (SELECT MIN(id) FROM products GROUP BY name);`);
    const p = await db.select().from(productsTable);
    console.log(`✅ Limpieza completada. Quedan ${p.length} productos.`);
  } catch (e) {
    console.error("Error en limpieza:", e);
  }
  process.exit(0);
}

run();
