import { pgTable, text, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botConfigTable = pgTable("bot_config", {
  id: text("id").primaryKey().default("default"),
  businessName: text("business_name").notNull().default("Mi Negocio"),
  welcomeMessage: text("welcome_message").notNull().default("¡Hola! Bienvenido a nuestro servicio. ¿En qué puedo ayudarte hoy?"),
  systemPrompt: text("system_prompt").notNull().default("Eres un asistente de ventas especializado y amable. Tu objetivo es ayudar a los clientes a encontrar los productos que necesitan, responder sus preguntas y guiarlos hacia la compra. Sé conciso, profesional y usa emojis ocasionalmente para hacer la conversación más amigable. Si no conoces la respuesta, indica que un humano le contactará pronto."),
  ollamaUrl: text("ollama_url").notNull().default("https://n8n-ollama.ginee6.easypanel.host"),
  ollamaModel: text("ollama_model").notNull().default("qwen2.5:1.5b"),
  ollamaTemperature: text("ollama_temperature").notNull().default("0.7"),
  ollamaMaxTokens: text("ollama_max_tokens").notNull().default("512"),
  autoReply: boolean("auto_reply").notNull().default(true),
  workingHoursEnabled: boolean("working_hours_enabled").notNull().default(false), // 24/7 por defecto
  workingHoursStart: varchar("working_hours_start", { length: 5 }).default("00:00"),
  workingHoursEnd: varchar("working_hours_end", { length: 5 }).default("23:59"),
  offHoursMessage: text("off_hours_message").default("Gracias por contactarnos. Actualmente estamos fuera de horario. Te responderemos pronto."),
  allowedNumbers: text("allowed_numbers").default(""),
  paymentMethods: text("payment_methods").default("cash,card,paypal,mercadolibre"),
  language: text("language").notNull().default("es"),
  aiProvider: text("ai_provider").notNull().default("ollama"),
  aiApiKey: text("ai_api_key").default(""),
  aiModel: text("ai_model").default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBotConfigSchema = createInsertSchema(botConfigTable).omit({ createdAt: true, updatedAt: true });
export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;
export type BotConfig = typeof botConfigTable.$inferSelect;
