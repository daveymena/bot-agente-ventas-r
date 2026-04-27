import { pgTable, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";

export const productsTable = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  category: text("category"), // legacy field, mantener por compatibilidad
  categoryId: text("category_id").references(() => categoriesTable.id, { onDelete: "set null" }), // nueva relación
  inStock: boolean("in_stock").notNull().default(true),
  imageUrl: text("image_url"),
  featured: boolean("featured").notNull().default(false), // productos destacados
  tags: text("tags"), // tags separados por coma para búsqueda
  driveNumber: real("drive_number"),
  driveUrl: text("drive_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
