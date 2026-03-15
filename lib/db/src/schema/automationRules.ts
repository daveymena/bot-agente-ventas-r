import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const automationRulesTable = pgTable("automation_rules", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  trigger: text("trigger").notNull(),
  triggerValue: text("trigger_value"),
  action: text("action").notNull(),
  actionValue: text("action_value"),
  enabled: boolean("enabled").notNull().default(true),
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAutomationRuleSchema = createInsertSchema(automationRulesTable).omit({ id: true, createdAt: true });
export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type AutomationRule = typeof automationRulesTable.$inferSelect;
