
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import fs from "fs";
import path from "path";

async function seed() {
  const jsonPath = "C:/Users/ADMIN/Pictures/AGENTE DE WHATSAPP/CATALOGO_FINAL_81_ULTIMATE.json";
  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const products = JSON.parse(rawData);

  console.log(`Cargando ${products.length} productos...`);

  // Imágenes reales disponibles en public/products/
  const realImages = [
    "excel_megapack.png",
    "guitarra_megapack.png",
    "piano_megapack.png",
    "resina_megapack.png",
    "trading_megapack.png"
  ];

  for (const p of products) {
    let imageUrl = null;
    
    // Intentar emparejar imagen real por nombre
    const fileName = p.imagen_portada.split("/").pop();
    if (realImages.includes(fileName)) {
      imageUrl = `/products/${fileName}`;
    } else {
      // Imagen por defecto según categoría o placeholder elegante
      imageUrl = `/products/placeholder_${p.categoria.toLowerCase()}.png`;
    }

    try {
      await db.insert(productsTable).values({
        id: p.id,
        name: p.titulo_comercial,
        description: p.ficha_tecnica.descripcion,
        price: p.precio,
        category: p.categoria,
        imageUrl: imageUrl,
        inStock: true,
        featured: p.numero_drive <= 5, // Destacar los primeros 5
        tags: p.ficha_tecnica.beneficios.join(","),
      }).onConflictDoUpdate({
        target: productsTable.id,
        set: {
          name: p.titulo_comercial,
          description: p.ficha_tecnica.descripcion,
          price: p.precio,
          category: p.categoria,
          imageUrl: imageUrl,
        }
      });
    } catch (e) {
      console.error(`Error insertando ${p.titulo_comercial}:`, e.message);
    }
  }

  console.log("¡Importación completada!");
  process.exit(0);
}

seed();
