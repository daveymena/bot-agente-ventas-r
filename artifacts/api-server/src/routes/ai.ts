import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { botConfigTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { PROVIDERS, testAIProvider, type AIProvider } from "../services/ai-provider.js";

const router: IRouter = Router();

router.get("/providers", (_req, res) => {
  const list = Object.values(PROVIDERS).map(p => ({
    id: p.id,
    name: p.name,
    tier: p.tier,
    description: p.description,
    requiresKey: p.requiresKey,
    defaultModel: p.defaultModel,
    models: p.models,
  }));
  res.json({ providers: list });
});

router.get("/config", async (_req, res) => {
  const rows = await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1);
  const cfg = rows[0] as any;
  const provider = (cfg?.aiProvider ?? "ollama") as AIProvider;
  res.json({
    provider,
    apiKey: cfg?.aiApiKey ? "***" : "",
    hasKey: !!(cfg?.aiApiKey),
    model: cfg?.aiModel || PROVIDERS[provider]?.defaultModel || "",
    ollamaUrl: cfg?.ollamaUrl ?? "https://n8n-ollama.ginee6.easypanel.host",
  });
});

router.put("/config", async (req, res) => {
  const { provider, apiKey, model, ollamaUrl } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (provider) (updates as any).aiProvider = provider;
  if (apiKey !== undefined && apiKey !== "***") (updates as any).aiApiKey = apiKey;
  if (model !== undefined) (updates as any).aiModel = model;
  if (ollamaUrl !== undefined) updates.ollamaUrl = ollamaUrl;

  const existing = await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1);
  if (existing.length === 0) {
    await db.insert(botConfigTable).values({ id: "default" });
  }
  await db.update(botConfigTable).set(updates).where(eq(botConfigTable.id, "default"));

  const rows = await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1);
  const cfg = rows[0] as any;
  const p = (cfg?.aiProvider ?? "ollama") as AIProvider;
  res.json({
    provider: p,
    apiKey: cfg?.aiApiKey ? "***" : "",
    hasKey: !!(cfg?.aiApiKey),
    model: cfg?.aiModel || PROVIDERS[p]?.defaultModel || "",
    ollamaUrl: cfg?.ollamaUrl,
  });
});

router.post("/test", async (req, res) => {
  const { provider, apiKey, model, ollamaUrl } = req.body;

  let resolvedKey = apiKey;
  if (!resolvedKey || resolvedKey === "***") {
    const rows = await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1);
    resolvedKey = (rows[0] as any)?.aiApiKey || "";
  }

  const meta = PROVIDERS[provider as AIProvider];
  if (!meta) return res.status(400).json({ error: "Unknown provider" });

  const result = await testAIProvider({
    provider: provider as AIProvider,
    model: model || meta.defaultModel,
    apiKey: resolvedKey,
    baseUrl: provider === "ollama" ? (ollamaUrl || meta.defaultBaseUrl) : meta.defaultBaseUrl,
    maxTokens: 80,
  });

  res.json(result);
});

export default router;
