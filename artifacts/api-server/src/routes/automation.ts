import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { automationRulesTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/rules", async (_req, res) => {
  const results = await db.select().from(automationRulesTable).orderBy(automationRulesTable.priority);
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(automationRulesTable);
  res.json({ rules: results.map(formatRule), total: Number(countResult[0].count) });
});

router.post("/rules", async (req, res) => {
  const { name, trigger, triggerValue, action, actionValue, enabled, priority } = req.body;
  if (!name || !trigger || !action) return res.status(400).json({ error: "name, trigger and action required" });
  
  const result = await db.insert(automationRulesTable).values({
    name,
    trigger,
    triggerValue: triggerValue ?? null,
    action,
    actionValue: actionValue ?? null,
    enabled: enabled !== false,
    priority: priority ?? 0,
  }).returning();
  
  res.status(201).json(formatRule(result[0]));
});

router.put("/rules/:id", async (req, res) => {
  const body = req.body;
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.trigger !== undefined) updates.trigger = body.trigger;
  if (body.triggerValue !== undefined) updates.triggerValue = body.triggerValue;
  if (body.action !== undefined) updates.action = body.action;
  if (body.actionValue !== undefined) updates.actionValue = body.actionValue;
  if (body.enabled !== undefined) updates.enabled = body.enabled;
  if (body.priority !== undefined) updates.priority = body.priority;

  await db.update(automationRulesTable).set(updates).where(eq(automationRulesTable.id, req.params.id));
  const results = await db.select().from(automationRulesTable).where(eq(automationRulesTable.id, req.params.id)).limit(1);
  if (results.length === 0) return res.status(404).json({ error: "Not found" });
  res.json(formatRule(results[0]));
});

router.delete("/rules/:id", async (req, res) => {
  await db.delete(automationRulesTable).where(eq(automationRulesTable.id, req.params.id));
  res.json({ success: true, id: req.params.id });
});

function formatRule(r: typeof automationRulesTable.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    trigger: r.trigger,
    triggerValue: r.triggerValue,
    action: r.action,
    actionValue: r.actionValue,
    enabled: r.enabled,
    priority: r.priority,
    createdAt: r.createdAt.toISOString(),
  };
}

export default router;
