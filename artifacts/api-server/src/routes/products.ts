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
