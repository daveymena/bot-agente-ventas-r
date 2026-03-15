import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contactsTable = pgTable("contacts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  phone: text("phone").notNull().unique(),
  name: text("name"),
  email: text("email"),
  tags: text("tags").default(""),
  notes: text("notes"),
  stage: text("stage").notNull().default("lead"),
  totalPurchases: integer("total_purchases").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertContactSchema = createInsertSchema(contactsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contactsTable.$inferSelect;
