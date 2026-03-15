import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { botConfigTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULT_OLLAMA_URL = "https://n8n-ollama.ginee6.easypanel.host";

async function getOllamaUrl() {
  const configs = await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1);
  return configs[0]?.ollamaUrl ?? DEFAULT_OLLAMA_URL;
}

router.get("/models", async (_req, res) => {
  try {
    const url = await getOllamaUrl();
    const response = await fetch(`${url}/api/tags`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json() as { models: Array<{ name: string; size: number; details: { family: string; parameter_size: string; quantization_level: string } }> };
    res.json({
      models: (data.models ?? []).map(m => ({
        name: m.name,
        size: m.size,
        family: m.details?.family ?? "unknown",
        parameterSize: m.details?.parameter_size ?? "unknown",
        quantization: m.details?.quantization_level ?? "unknown",
      })),
      connected: true,
    });
  } catch {
    res.json({ models: [], connected: false });
  }
});

router.get("/config", async (_req, res) => {
  const configs = await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1);
  const config = configs[0];
  if (!config) {
    return res.json({
      url: DEFAULT_OLLAMA_URL,
      model: "qwen2.5:1.5b",
      temperature: 0.7,
      maxTokens: 512,
      connected: false,
    });
  }

  let connected = false;
  try {
    const response = await fetch(`${config.ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    connected = response.ok;
  } catch { connected = false; }

  res.json({
    url: config.ollamaUrl,
    model: config.ollamaModel,
    temperature: parseFloat(config.ollamaTemperature),
    maxTokens: parseInt(config.ollamaMaxTokens),
    connected,
  });
});

router.put("/config", async (req, res) => {
  const { url, model, temperature, maxTokens } = req.body;
  const configs = await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1);
  if (configs.length === 0) {
    await db.insert(botConfigTable).values({ id: "default" });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (url !== undefined) updates.ollamaUrl = url;
  if (model !== undefined) updates.ollamaModel = model;
  if (temperature !== undefined) updates.ollamaTemperature = String(temperature);
  if (maxTokens !== undefined) updates.ollamaMaxTokens = String(maxTokens);

  await db.update(botConfigTable).set(updates).where(eq(botConfigTable.id, "default"));
  
  const newConfig = await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1);
  const cfg = newConfig[0];

  let connected = false;
  try {
    const response = await fetch(`${cfg.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
    connected = response.ok;
  } catch { connected = false; }

  res.json({
    url: cfg.ollamaUrl,
    model: cfg.ollamaModel,
    temperature: parseFloat(cfg.ollamaTemperature),
    maxTokens: parseInt(cfg.ollamaMaxTokens),
    connected,
  });
});

router.post("/test", async (req, res) => {
  const { message, model } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });

  const configs = await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1);
  const ollamaUrl = configs[0]?.ollamaUrl ?? DEFAULT_OLLAMA_URL;
  const ollamaModel = model ?? configs[0]?.ollamaModel ?? "qwen2.5:1.5b";

  const start = Date.now();
  try {
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [{ role: "user", content: message }],
        stream: false,
        options: { num_predict: 200 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.json({ response: `Error: ${text}`, model: ollamaModel, latencyMs: Date.now() - start, success: false });
    }

    const data = await response.json() as { message?: { content: string } };
    res.json({
      response: data.message?.content ?? "Sin respuesta",
      model: ollamaModel,
      latencyMs: Date.now() - start,
      success: true,
    });
  } catch (err) {
    res.json({
      response: `Error conectando a Ollama: ${String(err)}`,
      model: ollamaModel,
      latencyMs: Date.now() - start,
      success: false,
    });
  }
});

export default router;
