import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const conversationsTable = pgTable("conversations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  contactPhone: text("contact_phone").notNull(),
  contactName: text("contact_name"),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at"),
  status: text("status").notNull().default("active"),
  unreadCount: integer("unread_count").notNull().default(0),
  aiHandled: boolean("ai_handled").notNull().default(false),
  salesStage: text("sales_stage").notNull().default("welcome"),
  totalMessages: integer("total_messages").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({ id: true, createdAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversationsTable.$inferSelect;
