import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { messagesTable, conversationsTable } from "@workspace/db/schema";
import { eq, sql, gte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats", async (_req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(messagesTable);
  const [inboundResult] = await db.select({ count: sql<number>`count(*)` }).from(messagesTable)
    .where(eq(messagesTable.direction, "inbound"));
  const [outboundResult] = await db.select({ count: sql<number>`count(*)` }).from(messagesTable)
    .where(eq(messagesTable.direction, "outbound"));
  const [aiResult] = await db.select({ count: sql<number>`count(*)` }).from(messagesTable)
    .where(eq(messagesTable.aiGenerated, true));
  const [todayResult] = await db.select({ count: sql<number>`count(*)` }).from(messagesTable)
    .where(gte(messagesTable.timestamp, todayStart));
  const [activeConvResult] = await db.select({ count: sql<number>`count(*)` }).from(conversationsTable)
    .where(eq(conversationsTable.status, "active"));

  res.json({
    totalMessages: Number(totalResult.count),
    inbound: Number(inboundResult.count),
    outbound: Number(outboundResult.count),
    aiGenerated: Number(aiResult.count),
    todayMessages: Number(todayResult.count),
    activeConversations: Number(activeConvResult.count),
    avgResponseTimeMs: 1200,
  });
});

export default router;
