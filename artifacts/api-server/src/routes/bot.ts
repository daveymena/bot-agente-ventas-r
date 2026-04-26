import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { botConfigTable, contactsTable, conversationsTable, messagesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { whatsappService } from "../services/whatsapp.js";
import { callAI, PROVIDERS, type AIProvider } from "../services/ai-provider.js";

const router: IRouter = Router();

async function ensureConfig() {
  const existing = await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1);
  if (existing.length === 0) {
    await db.insert(botConfigTable).values({ id: "default" });
  }
  const configs = await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1);
  return configs[0];
}

// Auto-conectar WhatsApp al arrancar (intenta restaurar sesión guardada o genera QR)
setTimeout(() => {
  console.log("[VentaFlow] Auto-iniciando WhatsApp...");
  whatsappService.connect().catch((e) => console.error("[VentaFlow] Auto-connect error:", e));
}, 2000);

// Wire up incoming WhatsApp messages -> AI -> reply + persist conversation
whatsappService.setMessageHandler(async ({ from, text, pushName }) => {
  try {
    const config = await ensureConfig();

    // Upsert contact
    const existingContact = await db.select().from(contactsTable).where(eq(contactsTable.phone, from)).limit(1);
    if (existingContact.length === 0) {
      await db.insert(contactsTable).values({
        phone: from,
        name: pushName ?? from,
        stage: "lead",
      }).onConflictDoNothing();
    }

    // Get or create conversation
    const existingConv = await db.select().from(conversationsTable).where(eq(conversationsTable.contactPhone, from)).limit(1);
    let conversationId: string;
    if (existingConv.length === 0) {
      conversationId = crypto.randomUUID();
      await db.insert(conversationsTable).values({
        id: conversationId,
        contactPhone: from,
        contactName: pushName ?? from,
        lastMessage: text,
        lastMessageAt: new Date(),
        status: "active",
        unreadCount: 1,
        aiHandled: !!config.autoReply,
        totalMessages: 1,
      });
    } else {
      conversationId = existingConv[0].id;
      await db.update(conversationsTable)
        .set({
          lastMessage: text,
          lastMessageAt: new Date(),
          unreadCount: (existingConv[0].unreadCount ?? 0) + 1,
          totalMessages: (existingConv[0].totalMessages ?? 0) + 1,
        })
        .where(eq(conversationsTable.id, conversationId));
    }

    // Persist inbound
    await db.insert(messagesTable).values({
      conversationId,
      content: text,
      direction: "inbound",
      aiGenerated: false,
      status: "delivered",
      timestamp: new Date(),
    });

    if (!config.autoReply) return null;

    // Working hours check
    if (config.workingHoursStart && config.workingHoursEnd) {
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0");
      if (hh < config.workingHoursStart || hh > config.workingHoursEnd) {
        return config.offHoursMessage ?? null;
      }
    }

    // Generate AI reply using configured provider
    const provider = ((config as any).aiProvider ?? "ollama") as AIProvider;
    const meta = PROVIDERS[provider];
    const aiResp = await callAI(
      [
        { role: "system", content: config.systemPrompt ?? "Eres un asistente de ventas profesional." },
        { role: "user", content: text },
      ],
      {
        provider,
        apiKey: (config as any).aiApiKey ?? undefined,
        baseUrl: provider === "ollama" ? (config.ollamaUrl ?? meta.defaultBaseUrl) : meta.defaultBaseUrl,
        model: (config as any).aiModel ?? (provider === "ollama" ? config.ollamaModel : meta.defaultModel),
        temperature: 0.7,
        maxTokens: 512,
      }
    );
    const reply = aiResp.content?.trim() || null;

    if (reply) {
      await db.insert(messagesTable).values({
        conversationId,
        content: reply,
        direction: "outbound",
        aiGenerated: true,
        status: "sent",
        timestamp: new Date(),
      });
    }
    return reply;
  } catch (err) {
    console.error("[VentaFlow] Handler error:", err);
    return null;
  }
});

router.get("/status", async (_req, res) => {
  const s = whatsappService.state;
  const uptime = s.startTime ? Date.now() - s.startTime : null;
  res.json({
    connected: s.connected,
    phone: s.phone,
    name: s.name,
    status: s.status,
    uptime,
    messagesHandled: s.messagesHandled,
    lastError: s.lastError,
  });
});

router.get("/config", async (_req, res) => {
  const config = await ensureConfig();
  res.json(formatConfig(config));
});

function formatConfig(config: typeof botConfigTable.$inferSelect) {
  return {
    id: config.id,
    businessName: config.businessName,
    welcomeMessage: config.welcomeMessage,
    systemPrompt: config.systemPrompt,
    ollamaUrl: config.ollamaUrl,
    ollamaModel: config.ollamaModel,
    autoReply: config.autoReply,
    workingHoursStart: config.workingHoursStart,
    workingHoursEnd: config.workingHoursEnd,
    offHoursMessage: config.offHoursMessage,
    allowedNumbers: config.allowedNumbers ? config.allowedNumbers.split(",").filter(Boolean) : [],
    paymentMethods: (config as any).paymentMethods ? (config as any).paymentMethods.split(",").filter(Boolean) : [],
    language: (config as any).language ?? "es",
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}

router.put("/config", async (req, res) => {
  const body = req.body;
  await ensureConfig();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.businessName !== undefined) updates.businessName = body.businessName;
  if (body.welcomeMessage !== undefined) updates.welcomeMessage = body.welcomeMessage;
  if (body.systemPrompt !== undefined) updates.systemPrompt = body.systemPrompt;
  if (body.ollamaUrl !== undefined) updates.ollamaUrl = body.ollamaUrl;
  if (body.ollamaModel !== undefined) updates.ollamaModel = body.ollamaModel;
  if (body.autoReply !== undefined) updates.autoReply = body.autoReply;
  if (body.workingHoursStart !== undefined) updates.workingHoursStart = body.workingHoursStart;
  if (body.workingHoursEnd !== undefined) updates.workingHoursEnd = body.workingHoursEnd;
  if (body.offHoursMessage !== undefined) updates.offHoursMessage = body.offHoursMessage;
  if (body.allowedNumbers !== undefined) updates.allowedNumbers = Array.isArray(body.allowedNumbers) ? body.allowedNumbers.join(",") : body.allowedNumbers;
  if (body.paymentMethods !== undefined) (updates as any).paymentMethods = Array.isArray(body.paymentMethods) ? body.paymentMethods.join(",") : body.paymentMethods;
  if (body.language !== undefined) (updates as any).language = body.language;

  await db.update(botConfigTable).set(updates).where(eq(botConfigTable.id, "default"));
  const config = await ensureConfig();
  res.json(formatConfig(config));
});

router.get("/qr", (_req, res) => {
  res.json({
    qr: whatsappService.state.qrCode,
    status: whatsappService.state.status,
  });
});

router.post("/connect", async (_req, res) => {
  try {
    // Fire and forget - QR will appear via /qr polling
    whatsappService.connect().catch((e) => console.error("[bot] connect error:", e));
    const s = whatsappService.state;
    res.json({
      connected: s.connected,
      phone: s.phone,
      name: s.name,
      status: s.status,
      uptime: s.startTime ? Date.now() - s.startTime : null,
      messagesHandled: s.messagesHandled,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "connect failed" });
  }
});

router.post("/disconnect", async (_req, res) => {
  await whatsappService.disconnect();
  const s = whatsappService.state;
  res.json({
    connected: false,
    phone: null,
    name: null,
    status: "disconnected",
    uptime: null,
    messagesHandled: s.messagesHandled,
  });
});

export default router;
