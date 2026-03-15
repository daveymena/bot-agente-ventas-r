import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agentSessionsTable = pgTable("agent_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull().default("New Session"),
  messages: text("messages").notNull().default("[]"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAgentSessionSchema = createInsertSchema(agentSessionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAgentSession = z.infer<typeof insertAgentSessionSchema>;
export type AgentSession = typeof agentSessionsTable.$inferSelect;
