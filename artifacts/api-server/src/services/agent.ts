import { db } from "@workspace/db";
import { botConfigTable, agentSessionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getAllTools, executeTool } from "./tools.js";

const DEFAULT_OLLAMA_URL = "https://n8n-ollama.ginee6.easypanel.host";
const DEFAULT_MODEL = "qwen2.5:1.5b";
const MAX_HISTORY = 10;

type MessageRole = "system" | "user" | "assistant" | "tool";
type SalesStage = "welcome" | "detection" | "presentation" | "objection" | "closure" | "postsale";

type OllamaMessage = {
  role: MessageRole;
  content: string;
  tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }>;
};

export type AgentMessage = {
  role: MessageRole;
  content: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
  timestamp: string;
};

const AGENT_PROMPTS: Record<SalesStage, string> = {
  welcome: `Eres el Agente de Bienvenida de {business}. Da la bienvenida de forma cálida y natural. Detecta el nombre e interés del cliente. Sé breve y amigable. Responde SOLO en {language}.`,

  detection: `Eres el Agente de Ventas de {business}. Haz preguntas para detectar exactamente qué necesita el cliente. Busca productos relevantes en el catálogo. Muestra opciones concretas con precio. Responde SOLO en {language}.`,

  presentation: `Eres el Agente de Presentación de {business}. Presenta el producto ideal con sus beneficios reales. Sé persuasivo, usa prueba social y emociones. Menciona métodos de pago disponibles: {payments}. Responde SOLO en {language}.`,

  objection: `Eres el Agente de Cierre de {business}. El cliente tiene dudas o objeciones. Abórdalas con empatía y argumentos sólidos. Ofrece garantías o alternativas. Conduce hacia la decisión de compra. Responde SOLO en {language}.`,

  closure: `Eres el Agente de Cierre de {business}. El cliente está listo para comprar. Confirma el pedido, método de pago ({payments}), y datos de entrega. Sé rápido y claro. Responde SOLO en {language}.`,

  postsale: `Eres el Agente Postventa de {business}. El cliente ya compró. Agradece, confirma el pedido, resuelve dudas de entrega y fideliza. Ofrece ayuda adicional. Responde SOLO en {language}.`,
};

async function getConfig() {
  const rows = await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1);
  const cfg = rows[0];
  return {
    ollamaUrl: cfg?.ollamaUrl ?? DEFAULT_OLLAMA_URL,
    model: cfg?.ollamaModel ?? DEFAULT_MODEL,
    temperature: parseFloat(cfg?.ollamaTemperature ?? "0.7"),
    maxTokens: parseInt(cfg?.ollamaMaxTokens ?? "512"),
    systemPrompt: cfg?.systemPrompt ?? "",
    businessName: cfg?.businessName ?? "Mi Negocio",
    paymentMethods: cfg?.paymentMethods ?? "cash,card,paypal",
    language: (cfg as any)?.language ?? "es",
  };
}

function buildPrompt(stage: SalesStage, cfg: Awaited<ReturnType<typeof getConfig>>): string {
  const payments = (cfg.paymentMethods || "").split(",").map(p => p.trim()).filter(Boolean)
    .map(p => ({ cash: "Efectivo", card: "Tarjeta", paypal: "PayPal", mercadolibre: "MercadoLibre" }[p] ?? p))
    .join(", ");
  const lang = { es: "español", en: "English", pt: "português" }[cfg.language] ?? cfg.language;
  const base = AGENT_PROMPTS[stage]
    .replace(/{business}/g, cfg.businessName)
    .replace(/{payments}/g, payments)
    .replace(/{language}/g, lang);
  return cfg.systemPrompt ? `${base}\n\nContexto adicional: ${cfg.systemPrompt}` : base;
}

export async function runAgentChat(
  sessionId: string | null,
  userMessage: string,
  existingMessages: AgentMessage[] = [],
  salesStage: SalesStage = "welcome"
): Promise<{ sessionId: string; response: string; messages: AgentMessage[]; toolsUsed: string[] }> {
  const config = await getConfig();
  const tools = await getAllTools();
  const toolsUsed: string[] = [];

  const systemPrompt = buildPrompt(salesStage, config);

  const recentHistory = existingMessages
    .filter(m => m.role !== "tool")
    .slice(-MAX_HISTORY);

  const ollamaMessages: OllamaMessage[] = [
    { role: "system", content: systemPrompt },
    ...recentHistory.map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const newAgentMessages: AgentMessage[] = [
    ...existingMessages,
    { role: "user", content: userMessage, timestamp: new Date().toISOString() },
  ];

  let finalResponse = "";
  let iterations = 0;

  while (iterations < 5) {
    iterations++;

    const body: Record<string, unknown> = {
      model: config.model,
      messages: ollamaMessages,
      stream: false,
      options: { temperature: config.temperature, num_predict: config.maxTokens },
    };

    if (tools.length > 0 && iterations === 1) {
      body.tools = tools.map(t => t.definition);
    }

    let data: { message: { role: string; content: string; tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }> }; done: boolean };
    try {
      const res = await fetch(`${config.ollamaUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) { finalResponse = `Ollama error ${res.status}`; break; }
      data = await res.json();
    } catch (e) {
      finalResponse = `Connection error: ${(e as Error).message}`;
      break;
    }

    const msg = data.message;

    if (!msg.tool_calls?.length) {
      finalResponse = msg.content || "Listo.";
      newAgentMessages.push({ role: "assistant", content: finalResponse, timestamp: new Date().toISOString() });
      break;
    }

    const toolResults: AgentMessage["toolCalls"] = [];
    ollamaMessages.push({ role: "assistant", content: msg.content || "", tool_calls: msg.tool_calls });

    for (const tc of msg.tool_calls) {
      const { name, arguments: args } = tc.function;
      toolsUsed.push(name);
      let result: unknown;
      try { result = await executeTool(name, args); } catch (e) { result = `Error: ${(e as Error).message}`; }
      toolResults.push({ name, args, result });
      ollamaMessages.push({ role: "tool", content: typeof result === "string" ? result : JSON.stringify(result) });
    }

    newAgentMessages.push({ role: "assistant", content: msg.content || "", toolCalls: toolResults, timestamp: new Date().toISOString() });
  }

  if (!finalResponse) {
    finalResponse = "He llegado al límite de iteraciones.";
    newAgentMessages.push({ role: "assistant", content: finalResponse, timestamp: new Date().toISOString() });
  }

  let resolvedId = sessionId;
  if (!resolvedId) {
    const title = userMessage.slice(0, 55) + (userMessage.length > 55 ? "…" : "");
    const [session] = await db.insert(agentSessionsTable).values({ title, messages: JSON.stringify(newAgentMessages) }).returning();
    resolvedId = session.id;
  } else {
    await db.update(agentSessionsTable).set({ messages: JSON.stringify(newAgentMessages), updatedAt: new Date() }).where(eq(agentSessionsTable.id, resolvedId));
  }

  return { sessionId: resolvedId!, response: finalResponse, messages: newAgentMessages, toolsUsed };
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
