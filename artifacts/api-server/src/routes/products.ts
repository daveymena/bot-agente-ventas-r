import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const results = await db.select().from(productsTable).orderBy(productsTable.createdAt);
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(productsTable);
  res.json({ products: results.map(formatProduct), total: Number(countResult[0].count) });
});

router.post("/", async (req, res) => {
  const { name, description, price, category, inStock, imageUrl } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: "name and price required" });
  
  const result = await db.insert(productsTable).values({
    name,
    description: description ?? null,
    price: Number(price),
    category: category ?? null,
    inStock: inStock !== false,
    imageUrl: imageUrl ?? null,
  }).returning();
  
  res.status(201).json(formatProduct(result[0]));
});

router.put("/:id", async (req, res) => {
  const body = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.price !== undefined) updates.price = Number(body.price);
  if (body.category !== undefined) updates.category = body.category;
  if (body.inStock !== undefined) updates.inStock = body.inStock;
  if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl;

  await db.update(productsTable).set(updates).where(eq(productsTable.id, req.params.id));
  const results = await db.select().from(productsTable).where(eq(productsTable.id, req.params.id)).limit(1);
  if (results.length === 0) return res.status(404).json({ error: "Not found" });
  res.json(formatProduct(results[0]));
});

router.delete("/:id", async (req, res) => {
  await db.delete(productsTable).where(eq(productsTable.id, req.params.id));
  res.json({ success: true, id: req.params.id });
});

router.post("/import/json", async (req, res) => {
  try {
    let items = req.body;
    
    // Si viene anidado (ej. { data: [...] }), extraer el array
    if (!Array.isArray(items) && typeof items === 'object') {
      const arrayValues = Object.values(items).find(v => Array.isArray(v));
      if (arrayValues) items = arrayValues;
      else return res.status(400).json({ error: "No se encontró un listado de productos en el archivo." });
    }
    
    if (!Array.isArray(items)) return res.status(400).json({ error: "Formato no válido. Se esperaba una lista." });
    
    // Normalizador a prueba de balas
    const valid = items.map((p: any) => {
      // Detección heurística de columnas (Español/Inglés)
      const name = p.name || p.nombre || p.titulo || p.title || p.producto || p.product || p.Item || Object.values(p)[0];
      const rawPrice = p.price || p.precio || p.costo || p.valor || p.cost || p.Price || Object.values(p).find(v => typeof v === 'number' || (typeof v === 'string' && v.match(/\d/)));
      const description = p.description || p.descripcion || p.desc || p.detalle || p.details || "";
      const category = p.category || p.categoria || p.cat || p.tipo || p.type || p.Categoria || "General";
      const imageUrl = p.imageUrl || p.image_url || p.imagen || p.foto || p.image || p.url || p.Imagen || null;
      
      // Sanitización matemática del precio (extrae solo los números)
      let price = 0;
      if (typeof rawPrice === 'number') price = rawPrice;
      else if (typeof rawPrice === 'string') {
        const cleaned = rawPrice.replace(/[^0-9]/g, '');
        price = parseFloat(cleaned) || 0;
      }
      
      return {
        name: String(name || "Producto Sin Nombre").substring(0, 255),
        description: description ? String(description) : null,
        price: price,
        category: category ? String(category).substring(0, 50) : "General",
        inStock: true, // Forzamos stock activo para catálogos nuevos
        imageUrl: imageUrl ? String(imageUrl).substring(0, 255) : null,
      };
    }).filter(p => p.name !== "Producto Sin Nombre" || p.price > 0); // Filtramos filas totalmente vacías
    
    if (!valid.length) return res.status(400).json({ error: "El archivo no contiene productos válidos." });
    
    // Insertamos la data purificada en la Base de Datos
    const inserted = await db.insert(productsTable).values(valid).returning();
    res.status(201).json({ imported: inserted.length, products: inserted.map(formatProduct) });
  } catch (error: any) {
    console.error("[SaaS] Error importando catálogo:", error);
    res.status(500).json({ error: "Error interno al procesar el archivo. Formato corrupto." });
  }
});

function formatProduct(p: typeof productsTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    category: p.category,
    inStock: p.inStock,
    imageUrl: p.imageUrl,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export default router;
