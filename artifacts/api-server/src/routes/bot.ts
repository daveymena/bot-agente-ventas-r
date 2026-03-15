import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { botConfigTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

let botState = {
  connected: false,
  phone: null as string | null,
  name: null as string | null,
  status: "disconnected" as "disconnected" | "connecting" | "connected" | "qr_pending",
  startTime: null as number | null,
  messagesHandled: 0,
  qrCode: null as string | null,
};

async function ensureConfig() {
  const existing = await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1);
  if (existing.length === 0) {
    await db.insert(botConfigTable).values({ id: "default" });
  }
  const configs = await db.select().from(botConfigTable).where(eq(botConfigTable.id, "default")).limit(1);
  return configs[0];
}

router.get("/status", async (_req, res) => {
  const uptime = botState.startTime ? Date.now() - botState.startTime : null;
  res.json({
    connected: botState.connected,
    phone: botState.phone,
    name: botState.name,
    status: botState.status,
    uptime,
    messagesHandled: botState.messagesHandled,
  });
});

router.get("/config", async (_req, res) => {
  const config = await ensureConfig();
  res.json({
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
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  });
});

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

  await db.update(botConfigTable).set(updates).where(eq(botConfigTable.id, "default"));
  
  const config = await ensureConfig();
  res.json({
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
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  });
});

router.get("/qr", (_req, res) => {
  res.json({
    qr: botState.qrCode,
    status: botState.status,
  });
});

router.post("/connect", (_req, res) => {
  botState.status = "connecting";
  botState.qrCode = null;
  
  setTimeout(() => {
    botState.status = "qr_pending";
    botState.qrCode = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=openclaw-whatsapp-bot-demo-scan-me";
  }, 2000);

  res.json({
    connected: botState.connected,
    phone: botState.phone,
    name: botState.name,
    status: botState.status,
    uptime: null,
    messagesHandled: botState.messagesHandled,
  });
});

router.post("/disconnect", (_req, res) => {
  botState.connected = false;
  botState.phone = null;
  botState.name = null;
  botState.status = "disconnected";
  botState.startTime = null;
  botState.qrCode = null;

  res.json({
    connected: false,
    phone: null,
    name: null,
    status: "disconnected",
    uptime: null,
    messagesHandled: botState.messagesHandled,
  });
});

export { botState };
export default router;
