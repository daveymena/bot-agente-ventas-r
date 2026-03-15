import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { memoriesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const memories = await db.select().from(memoriesTable).limit(200);
  res.json({
    memories: memories.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
  });
});

router.post("/", async (req, res) => {
  const { key, value, tags } = req.body;
  if (!key || !value) return res.status(400).json({ error: "key and value are required" });
  const result = await db.insert(memoriesTable).values({
    key,
    value,
    tags: tags || "",
    source: "manual",
  }).returning();
  const m = result[0];
  res.status(201).json({ ...m, createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  await db.delete(memoriesTable).where(eq(memoriesTable.id, req.params.id));
  res.json({ success: true });
});

export default router;
