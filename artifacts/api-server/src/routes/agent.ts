import { Router, type IRouter } from "express";
import { runAgentChat, getSession, listSessions } from "../services/agent.js";
import { db } from "@workspace/db";
import { agentSessionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getBuiltinToolDefinitions } from "../services/tools.js";

const router: IRouter = Router();

router.get("/sessions", async (_req, res) => {
  const sessions = await listSessions();
  res.json({ sessions });
});

router.get("/sessions/:id", async (req, res) => {
  const session = await getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

router.delete("/sessions/:id", async (req, res) => {
  await db.delete(agentSessionsTable).where(eq(agentSessionsTable.id, req.params.id));
  res.json({ success: true });
});

router.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message) return res.status(400).json({ error: "message is required" });

  let existingMessages = [];
  if (sessionId) {
    const session = await getSession(sessionId);
    if (session) existingMessages = session.messages;
  }

  try {
    const result = await runAgentChat(sessionId || null, message, existingMessages);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/tools", (_req, res) => {
  const tools = getBuiltinToolDefinitions();
  res.json({
    tools: tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    })),
  });
});

export default router;
