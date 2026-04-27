
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Integrando el Megapack de Piano...");
  try {
    // Primero asegurarnos que el nombre sea único o manejar el conflicto
    await db.insert(productsTable).values({
      name: 'MEGAPACK COMPLETO DE PIANO',
      description: '🎹 Aprende desde cero hasta avanzado. Método práctico para avanzar paso a paso a tu ritmo.',
      price: 60000,
      category: 'MÚSICA',
      imageUrl: '/products/piano_megapack.png',
      driveNumber: 1,
      driveUrl: 'https://drive.google.com/open?id=1OkiLvS4Jlfohj7f0F9914lnfSfkedM9p'
    }).onConflictDoNothing();
    
    // Actualizar por si ya existe con otro nombre
    await db.update(productsTable)
      .set({ price: 60000, driveUrl: 'https://drive.google.com/open?id=1OkiLvS4Jlfohj7f0F9914lnfSfkedM9p' })
      .where(sql`name ILIKE '%piano%'`);

    console.log("✅ Piano integrado y actualizado.");
  } catch (e) {
    console.error("Error integrando piano:", e);
  }
  process.exit(0);
}

run();
