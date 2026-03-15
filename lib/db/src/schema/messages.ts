import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messagesTable = pgTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversation_id").notNull(),
  content: text("content").notNull(),
  direction: text("direction").notNull().default("inbound"),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  status: text("status").notNull().default("delivered"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
