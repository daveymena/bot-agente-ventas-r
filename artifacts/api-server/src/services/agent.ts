import { db } from "@workspace/db";
import { botConfigTable, agentSessionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getAllTools, executeTool } from "./tools.js";

const DEFAULT_OLLAMA_URL = "https://n8n-ollama.ginee6.easypanel.host";
const DEFAULT_MODEL = "qwen2.5:1.5b";

type MessageRole = "system" | "user" | "assistant" | "tool";

type OllamaMessage = {
  role: MessageRole;
  content: string;
  tool_calls?: Array<{
    function: { name: string; arguments: Record<string, unknown> };
  }>;
};

type AgentMessage = {
  role: MessageRole;
  content: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown>; result: unknown }>;
  timestamp: string;
};

async function getConfig() {
  const rows = await db.select().from(botConfigTable)
    .where(eq(botConfigTable.id, "default"))
    .limit(1);
  const cfg = rows[0];
  return {
    ollamaUrl: cfg?.ollamaUrl ?? DEFAULT_OLLAMA_URL,
    model: cfg?.ollamaModel ?? DEFAULT_MODEL,
    temperature: parseFloat(cfg?.ollamaTemperature ?? "0.7"),
    maxTokens: parseInt(cfg?.ollamaMaxTokens ?? "1024"),
    systemPrompt: cfg?.systemPrompt ?? "",
  };
}

function buildSystemPrompt(customPrompt: string): string {
  const now = new Date().toLocaleString("en-US", { timeZone: "UTC", dateStyle: "full", timeStyle: "short" });
  return `You are OpenClaw, a powerful personal AI assistant capable of executing tasks autonomously using a set of tools.

Current date/time: ${now}

You have access to tools that let you:
- Search the web for current information
- Fetch and read any URL
- Make HTTP requests to external APIs and webhooks
- Search contacts and products in the database
- Save and recall memories persistently
- Calculate math expressions
- Run custom automation skills

${customPrompt ? `\nAdditional context:\n${customPrompt}` : ""}

When given a task:
1. Break it into steps
2. Use the appropriate tools to gather information or take actions
3. If a tool returns an error, try an alternative approach
4. Provide a clear, concise final answer once you have all the information
5. Save important results to memory if they might be useful later

Be proactive — if you think a tool would help, use it without being asked.`;
}

export async function runAgentChat(
  sessionId: string | null,
  userMessage: string,
  existingMessages: AgentMessage[] = []
): Promise<{
  sessionId: string;
  response: string;
  messages: AgentMessage[];
  toolsUsed: string[];
}> {
  const config = await getConfig();
  const tools = await getAllTools();
  const toolDefinitions = tools.map(t => t.definition);

  const systemPrompt = buildSystemPrompt(config.systemPrompt);
  const toolsUsed: string[] = [];

  const ollamaMessages: OllamaMessage[] = [
    { role: "system", content: systemPrompt },
    ...existingMessages.map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const newAgentMessages: AgentMessage[] = [
    ...existingMessages,
    { role: "user", content: userMessage, timestamp: new Date().toISOString() },
  ];

  let finalResponse = "";
  let iterations = 0;
  const maxIterations = 6;

  while (iterations < maxIterations) {
    iterations++;

    const body: Record<string, unknown> = {
      model: config.model,
      messages: ollamaMessages,
      stream: false,
      options: {
        temperature: config.temperature,
        num_predict: config.maxTokens,
      },
    };

    if (toolDefinitions.length > 0) {
      body.tools = toolDefinitions;
    }

    let ollamaRes: Response;
    try {
      ollamaRes = await fetch(`${config.ollamaUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
    } catch (e) {
      finalResponse = `Error connecting to Ollama: ${(e as Error).message}`;
      break;
    }

    if (!ollamaRes.ok) {
      finalResponse = `Ollama returned HTTP ${ollamaRes.status}`;
      break;
    }

    const data = await ollamaRes.json() as {
      message: {
        role: string;
        content: string;
        tool_calls?: Array<{
          function: { name: string; arguments: Record<string, unknown> };
        }>;
      };
      done: boolean;
    };

    const msg = data.message;

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      finalResponse = msg.content || "Done.";
      newAgentMessages.push({
        role: "assistant",
        content: finalResponse,
        timestamp: new Date().toISOString(),
      });
      break;
    }

    const toolCallResults: Array<{ name: string; args: Record<string, unknown>; result: unknown }> = [];

    ollamaMessages.push({ role: "assistant", content: msg.content || "", tool_calls: msg.tool_calls });

    for (const toolCall of msg.tool_calls) {
      const { name, arguments: args } = toolCall.function;
      toolsUsed.push(name);

      let result: unknown;
      try {
        result = await executeTool(name, args);
      } catch (e) {
        result = `Tool execution error: ${(e as Error).message}`;
      }

      toolCallResults.push({ name, args, result });

      ollamaMessages.push({
        role: "tool",
        content: typeof result === "string" ? result : JSON.stringify(result),
      });
    }

    newAgentMessages.push({
      role: "assistant",
      content: msg.content || "",
      toolCalls: toolCallResults,
      timestamp: new Date().toISOString(),
    });
  }

  if (iterations >= maxIterations && !finalResponse) {
    finalResponse = "I reached the maximum number of tool iterations. Here's what I found so far.";
    newAgentMessages.push({
      role: "assistant",
      content: finalResponse,
      timestamp: new Date().toISOString(),
    });
  }

  let resolvedSessionId = sessionId;
  if (!resolvedSessionId) {
    const title = userMessage.slice(0, 60) + (userMessage.length > 60 ? "..." : "");
    const session = await db.insert(agentSessionsTable).values({
      title,
      messages: JSON.stringify(newAgentMessages),
    }).returning();
    resolvedSessionId = session[0].id;
  } else {
    await db.update(agentSessionsTable)
      .set({
        messages: JSON.stringify(newAgentMessages),
        updatedAt: new Date(),
      })
      .where(eq(agentSessionsTable.id, resolvedSessionId));
  }

  return {
    sessionId: resolvedSessionId,
    response: finalResponse,
    messages: newAgentMessages,
    toolsUsed,
  };
}

export async function getSession(id: string) {
  const rows = await db.select().from(agentSessionsTable).where(eq(agentSessionsTable.id, id)).limit(1);
  if (!rows.length) return null;
  const session = rows[0];
  return {
    id: session.id,
    title: session.title,
    messages: JSON.parse(session.messages) as AgentMessage[],
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

export async function listSessions() {
  const rows = await db.select({
    id: agentSessionsTable.id,
    title: agentSessionsTable.title,
    createdAt: agentSessionsTable.createdAt,
    updatedAt: agentSessionsTable.updatedAt,
  }).from(agentSessionsTable).limit(50);
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}
