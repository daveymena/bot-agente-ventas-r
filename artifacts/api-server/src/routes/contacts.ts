import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { contactsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const results = await db.select().from(contactsTable).orderBy(contactsTable.createdAt);
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(contactsTable);
  res.json({ contacts: results.map(formatContact), total: Number(countResult[0].count) });
});

router.get("/:id", async (req, res) => {
  const results = await db.select().from(contactsTable).where(eq(contactsTable.id, req.params.id)).limit(1);
  if (results.length === 0) return res.status(404).json({ error: "Not found" });
  res.json(formatContact(results[0]));
});

router.post("/", async (req, res) => {
  const { phone, name, email, tags, notes, stage } = req.body;
  if (!phone) return res.status(400).json({ error: "phone required" });
  
  const result = await db.insert(contactsTable).values({
    phone,
    name: name ?? null,
    email: email ?? null,
    tags: Array.isArray(tags) ? tags.join(",") : tags ?? "",
    notes: notes ?? null,
    stage: stage ?? "lead",
  }).returning();
  
  res.status(201).json(formatContact(result[0]));
});

router.put("/:id", async (req, res) => {
  const body = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.email !== undefined) updates.email = body.email;
  if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags.join(",") : body.tags;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.stage !== undefined) updates.stage = body.stage;

  await db.update(contactsTable).set(updates).where(eq(contactsTable.id, req.params.id));
  const results = await db.select().from(contactsTable).where(eq(contactsTable.id, req.params.id)).limit(1);
  if (results.length === 0) return res.status(404).json({ error: "Not found" });
  res.json(formatContact(results[0]));
});

function formatContact(c: typeof contactsTable.$inferSelect) {
  return {
    id: c.id,
    phone: c.phone,
    name: c.name,
    email: c.email,
    tags: c.tags ? c.tags.split(",").filter(Boolean) : [],
    notes: c.notes,
    stage: c.stage,
    totalPurchases: c.totalPurchases,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export default router;
