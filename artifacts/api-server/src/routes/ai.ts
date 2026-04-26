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

// ===== GitHub OAuth Device Flow =====
// Usamos el client_id público de GitHub CLI (mismo flow que `gh auth login` y VS Code).
// El usuario autoriza en github.com/login/device, sin necesidad de PAT manual.
const GITHUB_DEVICE_CLIENT_ID = "178c6fc778ccc68e1d6a";

router.post("/github/device-start", async (_req, res) => {
  try {
    const r = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: GITHUB_DEVICE_CLIENT_ID, scope: "read:user" }),
    });
    const data = await r.json() as any;
    if (!data.device_code) {
      return res.status(500).json({ error: data.error_description || data.error || "device-start failed" });
    }
    res.json({
      device_code: data.device_code,
      user_code: data.user_code,
      verification_uri: data.verification_uri,
      verification_uri_complete: data.verification_uri_complete || `${data.verification_uri}?user_code=${data.user_code}`,
      expires_in: data.expires_in,
      interval: data.interval ?? 5,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "network error" });
  }
});

router.post("/github/device-poll", async (req, res) => {
  const { device_code } = req.body;
  if (!device_code) return res.status(400).json({ error: "device_code required" });
  try {
    const r = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: GITHUB_DEVICE_CLIENT_ID,
        device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });
    const data = await r.json() as any;
    if (data.access_token) {
      // Guardar token en DB y activar provider github
      const existing = await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1);
      if (existing.length === 0) {
        await db.insert(botConfigTable).values({ id: "default" });
      }
      await db.update(botConfigTable).set({
        aiProvider: "github",
        aiApiKey: data.access_token,
        aiModel: "gpt-4o-mini",
        updatedAt: new Date(),
      } as any).where(eq(botConfigTable.id, "default"));
      return res.json({ ok: true, status: "authorized", provider: "github", model: "gpt-4o-mini" });
    }
    // pending / slow_down / expired_token / access_denied
    res.json({ ok: false, status: data.error || "pending", interval: data.interval });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "network error" });
  }
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
