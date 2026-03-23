import { db } from "@workspace/db";
import { botConfigTable, agentSessionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getAllTools, executeTool } from "./tools.js";
import { callAI, PROVIDERS, type AIProvider, type AIMessage, type AITool } from "./ai-provider.js";

const MAX_HISTORY = 10;

type SalesStage = "welcome" | "detection" | "presentation" | "objection" | "closure" | "postsale";

export type AgentMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
  timestamp: string;
};

const AGENT_PROMPTS: Record<SalesStage, string> = {
  welcome: `Eres el Agente de Bienvenida de {business}. Da la bienvenida de forma cálida y natural. Detecta el nombre e interés del cliente. Sé breve y amigable. Responde SOLO en {language}.`,
  detection: `Eres el Agente de Ventas de {business}. Haz preguntas para detectar exactamente qué necesita el cliente. Busca productos relevantes en el catálogo. Muestra opciones concretas con precio. Responde SOLO en {language}.`,
  presentation: `Eres el Agente de Presentación de {business}. Presenta el producto ideal con sus beneficios reales. Sé persuasivo. Menciona métodos de pago disponibles: {payments}. Responde SOLO en {language}.`,
  objection: `Eres el Agente de Objeciones de {business}. El cliente tiene dudas. Abórdalas con empatía y argumentos sólidos. Ofrece garantías. Conduce hacia la decisión de compra. Responde SOLO en {language}.`,
  closure: `Eres el Agente de Cierre de {business}. El cliente está listo para comprar. Confirma el pedido, método de pago ({payments}), y datos de entrega. Sé rápido y claro. Responde SOLO en {language}.`,
  postsale: `Eres el Agente Postventa de {business}. El cliente ya compró. Agradece, confirma el pedido, resuelve dudas y fideliza. Responde SOLO en {language}.`,
};

async function getConfig() {
  const rows = await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1);
  const cfg = rows[0] as any;
  const provider = (cfg?.aiProvider ?? "ollama") as AIProvider;
  const meta = PROVIDERS[provider];
  return {
    provider,
    apiKey: cfg?.aiApiKey ?? "",
    model: cfg?.aiModel || meta?.defaultModel || "qwen2.5:1.5b",
    baseUrl: provider === "ollama" ? (cfg?.ollamaUrl ?? meta.defaultBaseUrl) : meta?.defaultBaseUrl,
    temperature: parseFloat(cfg?.ollamaTemperature ?? "0.7"),
    maxTokens: parseInt(cfg?.ollamaMaxTokens ?? "512"),
    systemPrompt: cfg?.systemPrompt ?? "",
    businessName: cfg?.businessName ?? "Mi Negocio",
    paymentMethods: cfg?.paymentMethods ?? "cash,card,paypal",
    language: cfg?.language ?? "es",
  };
}

function buildStagePrompt(stage: SalesStage, cfg: Awaited<ReturnType<typeof getConfig>>): string {
  const payments = (cfg.paymentMethods || "").split(",").map((p: string) => p.trim()).filter(Boolean)
    .map((p: string) => ({ cash: "Efectivo", card: "Tarjeta", paypal: "PayPal", mercadolibre: "MercadoLibre" }[p] ?? p))
    .join(", ");
  const lang = { es: "español", en: "English", pt: "português" }[cfg.language] ?? cfg.language;
  const base = AGENT_PROMPTS[stage]
    .replace(/{business}/g, cfg.businessName)
    .replace(/{payments}/g, payments)
    .replace(/{language}/g, lang);
  return cfg.systemPrompt ? `${base}\n\nContexto adicional: ${cfg.systemPrompt}` : base;
}

function buildAgentSystemPrompt(cfg: Awaited<ReturnType<typeof getConfig>>): string {
  const now = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "full", timeStyle: "short" });
  return `Eres OpenClaw, un asistente AI avanzado capaz de ejecutar tareas usando herramientas.

Fecha y hora actual: ${now}
Negocio: ${cfg.businessName}

Con tus herramientas puedes: buscar en la web, leer URLs, hacer peticiones HTTP, buscar contactos y productos, guardar memorias, calcular y ejecutar skills personalizados.

${cfg.systemPrompt ? `Contexto adicional:\n${cfg.systemPrompt}` : ""}

Cuando tengas una tarea: analiza, usa las herramientas apropiadas, y da una respuesta clara y concisa.`;
}

export async function runAgentChat(
  sessionId: string | null,
  userMessage: string,
  existingMessages: AgentMessage[] = [],
  salesStage: SalesStage = "welcome",
  mode: "agent" | "sales" = "agent"
): Promise<{ sessionId: string; response: string; messages: AgentMessage[]; toolsUsed: string[]; provider: string }> {
  const config = await getConfig();
  const tools = await getAllTools();
  const toolsUsed: string[] = [];

  const systemContent = mode === "sales"
    ? buildStagePrompt(salesStage, config)
    : buildAgentSystemPrompt(config);

  const recentHistory = existingMessages.filter(m => m.role !== "tool").slice(-MAX_HISTORY);

  const aiMessages: AIMessage[] = [
    { role: "system", content: systemContent },
    ...recentHistory.map(m => ({ role: m.role as AIMessage["role"], content: m.content })),
    { role: "user", content: userMessage },
  ];

  const newMessages: AgentMessage[] = [
    ...existingMessages,
    { role: "user", content: userMessage, timestamp: new Date().toISOString() },
  ];

  let finalResponse = "";
  let iterations = 0;
  const aiCfg = {
    provider: config.provider,
    model: config.model,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  };

  while (iterations < 5) {
    iterations++;
    let result;
    try {
      result = await callAI(aiMessages, aiCfg, iterations === 1 && tools.length ? tools.map(t => t.definition) as AITool[] : undefined);
    } catch (e) {
      finalResponse = `Error de conexión con ${config.provider}: ${(e as Error).message}`;
      break;
    }

    if (!result.tool_calls?.length) {
      finalResponse = result.content || "Listo.";
      newMessages.push({ role: "assistant", content: finalResponse, timestamp: new Date().toISOString() });
      break;
    }

    const toolResults: AgentMessage["toolCalls"] = [];
    aiMessages.push({ role: "assistant", content: result.content || "", tool_calls: result.tool_calls });

    for (const tc of result.tool_calls) {
      const { name, arguments: args } = tc.function;
      toolsUsed.push(name);
      let toolResult: unknown;
      try { toolResult = await executeTool(name, args); } catch (e) { toolResult = `Error: ${(e as Error).message}`; }
      toolResults.push({ name, args, result: toolResult });
      aiMessages.push({ role: "tool", content: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult) });
    }

    newMessages.push({ role: "assistant", content: result.content || "", toolCalls: toolResults, timestamp: new Date().toISOString() });
  }

  if (!finalResponse) {
    finalResponse = "He completado el proceso.";
    newMessages.push({ role: "assistant", content: finalResponse, timestamp: new Date().toISOString() });
  }

  let resolvedId = sessionId;
  if (!resolvedId) {
    const title = userMessage.slice(0, 55) + (userMessage.length > 55 ? "…" : "");
    const [session] = await db.insert(agentSessionsTable).values({ title, messages: JSON.stringify(newMessages) }).returning();
    resolvedId = session.id;
  } else {
    await db.update(agentSessionsTable).set({ messages: JSON.stringify(newMessages), updatedAt: new Date() }).where(eq(agentSessionsTable.id, resolvedId));
  }

  return { sessionId: resolvedId!, response: finalResponse, messages: newMessages, toolsUsed, provider: config.provider };
}

export async function getSession(id: string) {
  const rows = await db.select().from(agentSessionsTable).where(eq(agentSessionsTable.id, id)).limit(1);
  if (!rows.length) return null;
  const s = rows[0];
  return { id: s.id, title: s.title, messages: JSON.parse(s.messages) as AgentMessage[], createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() };
}

export async function listSessions() {
  const rows = await db.select({ id: agentSessionsTable.id, title: agentSessionsTable.title, createdAt: agentSessionsTable.createdAt, updatedAt: agentSessionsTable.updatedAt }).from(agentSessionsTable).limit(50);
  return rows.map(r => ({ id: r.id, title: r.title, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }));
}

export { AGENT_PROMPTS, type SalesStage };
