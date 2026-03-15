import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const limit = Number(req.query.limit) || 20;
  const offset = Number(req.query.offset) || 0;
  const status = req.query.status as string | undefined;

  const query = db.select().from(conversationsTable);
  if (status) {
    const results = await db.select().from(conversationsTable)
      .where(eq(conversationsTable.status, status))
      .orderBy(desc(conversationsTable.lastMessageAt))
      .limit(limit)
      .offset(offset);
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(conversationsTable)
      .where(eq(conversationsTable.status, status));
    return res.json({ 
      conversations: results.map(formatConversation), 
      total: Number(countResult[0].count) 
    });
  }
  
  const results = await query.orderBy(desc(conversationsTable.lastMessageAt)).limit(limit).offset(offset);
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(conversationsTable);
  res.json({ conversations: results.map(formatConversation), total: Number(countResult[0].count) });
});

router.get("/:id", async (req, res) => {
  const results = await db.select().from(conversationsTable)
    .where(eq(conversationsTable.id, req.params.id)).limit(1);
  if (results.length === 0) return res.status(404).json({ error: "Not found" });
  res.json(formatConversation(results[0]));
});

router.get("/:id/messages", async (req, res) => {
  const limit = Number(req.query.limit) || 50;
  const msgs = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, req.params.id))
    .orderBy(desc(messagesTable.timestamp))
    .limit(limit);
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(messagesTable)
    .where(eq(messagesTable.conversationId, req.params.id));
  res.json({ messages: msgs.map(formatMessage), total: Number(countResult[0].count) });
});

router.post("/:id/send", async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "content required" });
  
  const msg = await db.insert(messagesTable).values({
    conversationId: req.params.id,
    content,
    direction: "outbound",
    aiGenerated: false,
    status: "sent",
    timestamp: new Date(),
  }).returning();

  await db.update(conversationsTable)
    .set({ lastMessage: content, lastMessageAt: new Date(), totalMessages: sql`${conversationsTable.totalMessages} + 1` })
    .where(eq(conversationsTable.id, req.params.id));

  res.json(formatMessage(msg[0]));
});

function formatConversation(c: typeof conversationsTable.$inferSelect) {
  return {
    id: c.id,
    contactPhone: c.contactPhone,
    contactName: c.contactName,
    lastMessage: c.lastMessage,
    lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
    status: c.status,
    unreadCount: c.unreadCount,
    aiHandled: c.aiHandled,
    totalMessages: c.totalMessages,
    createdAt: c.createdAt.toISOString(),
  };
}

function formatMessage(m: typeof messagesTable.$inferSelect) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    content: m.content,
    direction: m.direction,
    aiGenerated: m.aiGenerated,
    status: m.status,
    timestamp: m.timestamp.toISOString(),
  };
}

export default router;
