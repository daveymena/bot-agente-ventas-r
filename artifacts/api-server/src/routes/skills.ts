import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { skillsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { runSkillCode } from "../services/skillRunner.js";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const skills = await db.select().from(skillsTable).limit(100);
  res.json({ skills: skills.map(s => ({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() })) });
});

router.get("/:id", async (req, res) => {
  const rows = await db.select().from(skillsTable).where(eq(skillsTable.id, req.params.id)).limit(1);
  if (!rows.length) return res.status(404).json({ error: "Skill not found" });
  const s = rows[0];
  res.json({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() });
});

router.post("/", async (req, res) => {
  const { name, description, code, parametersSchema, enabled } = req.body;
  if (!name || !description || !code) return res.status(400).json({ error: "name, description and code are required" });
  const result = await db.insert(skillsTable).values({
    name,
    description,
    code,
    parametersSchema: parametersSchema || "{}",
    enabled: enabled !== false,
  }).returning();
  const s = result[0];
  res.status(201).json({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() });
});

router.put("/:id", async (req, res) => {
  const body = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.code !== undefined) updates.code = body.code;
  if (body.parametersSchema !== undefined) updates.parametersSchema = body.parametersSchema;
  if (body.enabled !== undefined) updates.enabled = body.enabled;

  await db.update(skillsTable).set(updates).where(eq(skillsTable.id, req.params.id));
  const rows = await db.select().from(skillsTable).where(eq(skillsTable.id, req.params.id)).limit(1);
  if (!rows.length) return res.status(404).json({ error: "Skill not found" });
  const s = rows[0];
  res.json({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  await db.delete(skillsTable).where(eq(skillsTable.id, req.params.id));
  res.json({ success: true, id: req.params.id });
});

router.post("/:id/run", async (req, res) => {
  const rows = await db.select().from(skillsTable).where(eq(skillsTable.id, req.params.id)).limit(1);
  if (!rows.length) return res.status(404).json({ error: "Skill not found" });
  const skill = rows[0];
  const params = req.body.params || {};
  const start = Date.now();
  try {
    const output = await runSkillCode(skill.code, params);
    res.json({ success: true, output, durationMs: Date.now() - start });
  } catch (e) {
    res.json({ success: false, error: (e as Error).message, durationMs: Date.now() - start });
  }
});

export default router;
