export type AIProvider = "ollama" | "openai" | "groq" | "openrouter" | "anthropic" | "gemini";

export type ProviderMeta = {
  id: AIProvider;
  name: string;
  tier: "free" | "paid" | "both";
  description: string;
  requiresKey: boolean;
  defaultBaseUrl: string;
  defaultModel: string;
  models: Array<{ id: string; name: string; tier: "free" | "paid" }>;
};

export const PROVIDERS: Record<AIProvider, ProviderMeta> = {
  ollama: {
    id: "ollama",
    name: "Ollama",
    tier: "free",
    description: "Self-hosted LLMs. Free and private. Requires your own instance.",
    requiresKey: false,
    defaultBaseUrl: "https://n8n-ollama.ginee6.easypanel.host",
    defaultModel: "qwen2.5:1.5b",
    models: [
      { id: "qwen2.5:0.5b", name: "Qwen 2.5 0.5B (fastest)", tier: "free" },
      { id: "qwen2.5:1.5b", name: "Qwen 2.5 1.5B (recommended)", tier: "free" },
      { id: "llama3.2:1b", name: "Llama 3.2 1B", tier: "free" },
      { id: "llama3.2:3b", name: "Llama 3.2 3B", tier: "free" },
      { id: "mistral:7b", name: "Mistral 7B", tier: "free" },
    ],
  },
  groq: {
    id: "groq",
    name: "Groq",
    tier: "free",
    description: "Ultra-fast inference. Generous free tier. No credit card required.",
    requiresKey: true,
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.1-8b-instant",
    models: [
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant (free)", tier: "free" },
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile (free)", tier: "free" },
      { id: "llama3-8b-8192", name: "Llama 3 8B (free)", tier: "free" },
      { id: "gemma2-9b-it", name: "Gemma 2 9B (free)", tier: "free" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B (free)", tier: "free" },
    ],
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    tier: "both",
    description: "Access 200+ models including free ones. One API key for all.",
    requiresKey: true,
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "mistralai/mistral-7b-instruct:free",
    models: [
      { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B Instruct (free)", tier: "free" },
      { id: "meta-llama/llama-3.2-3b-instruct:free", name: "Llama 3.2 3B (free)", tier: "free" },
      { id: "google/gemma-2-9b-it:free", name: "Gemma 2 9B (free)", tier: "free" },
      { id: "qwen/qwen-2.5-7b-instruct:free", name: "Qwen 2.5 7B (free)", tier: "free" },
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini (paid)", tier: "paid" },
      { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku (paid)", tier: "paid" },
      { id: "anthropic/claude-3-5-sonnet", name: "Claude 3.5 Sonnet (paid)", tier: "paid" },
      { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash (paid)", tier: "paid" },
    ],
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    tier: "paid",
    description: "GPT-4o and GPT-4o-mini. Best quality, requires payment.",
    requiresKey: true,
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini (fast, cheap)", tier: "paid" },
      { id: "gpt-4o", name: "GPT-4o (best quality)", tier: "paid" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo (legacy)", tier: "paid" },
    ],
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic Claude",
    tier: "paid",
    description: "Claude 3 family. Excellent for sales conversations and reasoning.",
    requiresKey: true,
    defaultBaseUrl: "https://api.anthropic.com",
    defaultModel: "claude-3-haiku-20240307",
    models: [
      { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku (fast, cheap)", tier: "paid" },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku (better)", tier: "paid" },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet (best)", tier: "paid" },
    ],
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    tier: "both",
    description: "Gemini Flash is free. Gemini Pro is paid. Via OpenAI-compatible API.",
    requiresKey: true,
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-1.5-flash",
    models: [
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (free tier)", tier: "free" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (free tier)", tier: "free" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (paid)", tier: "paid" },
    ],
  },
};

export type AIMessage = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_calls?: unknown };
export type AITool = { type: "function"; function: { name: string; description: string; parameters: unknown } };
export type AICallConfig = {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
};

export type AIResponse = {
  content: string;
  tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }>;
  promptTokens?: number;
  completionTokens?: number;
};

export async function callAI(
  messages: AIMessage[],
  cfg: AICallConfig,
  tools?: AITool[]
): Promise<AIResponse> {
  const meta = PROVIDERS[cfg.provider];

  if (cfg.provider === "anthropic") {
    return callAnthropic(messages, cfg, tools);
  }

  if (cfg.provider === "ollama") {
    return callOllama(messages, cfg, tools);
  }

  return callOpenAICompatible(messages, cfg, tools, meta.defaultBaseUrl);
}

async function callOllama(messages: AIMessage[], cfg: AICallConfig, tools?: AITool[]): Promise<AIResponse> {
  const base = (cfg.baseUrl || PROVIDERS.ollama.defaultBaseUrl).replace(/\/$/, "");
  const body: Record<string, unknown> = {
    model: cfg.model || PROVIDERS.ollama.defaultModel,
    messages,
    stream: false,
    options: { temperature: cfg.temperature ?? 0.7, num_predict: cfg.maxTokens ?? 512 },
  };
  if (tools?.length) body.tools = tools;

  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  const msg = data.message;
  return {
    content: msg.content || "",
    tool_calls: msg.tool_calls?.map((tc: any) => ({
      function: { name: tc.function.name, arguments: typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments },
    })),
  };
}

async function callOpenAICompatible(messages: AIMessage[], cfg: AICallConfig, tools?: AITool[], fallbackBase?: string): Promise<AIResponse> {
  const base = (cfg.baseUrl || fallbackBase || "").replace(/\/$/, "");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;
  if (cfg.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://ventaflow.app";
    headers["X-Title"] = "VentaFlow Sales Bot";
  }

  const body: Record<string, unknown> = {
    model: cfg.model,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    temperature: cfg.temperature ?? 0.7,
    max_tokens: cfg.maxTokens ?? 512,
  };
  if (tools?.length) body.tools = tools;

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`${cfg.provider} ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  const choice = data.choices?.[0];
  const msg = choice?.message;
  return {
    content: msg?.content || "",
    tool_calls: msg?.tool_calls?.map((tc: any) => ({
      function: { name: tc.function.name, arguments: typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments },
    })),
    promptTokens: data.usage?.prompt_tokens,
    completionTokens: data.usage?.completion_tokens,
  };
}

async function callAnthropic(messages: AIMessage[], cfg: AICallConfig, tools?: AITool[]): Promise<AIResponse> {
  const base = (cfg.baseUrl || PROVIDERS.anthropic.defaultBaseUrl).replace(/\/$/, "");
  const system = messages.filter(m => m.role === "system").map(m => m.content).join("\n");
  const nonSystem = messages.filter(m => m.role !== "system" && m.role !== "tool").map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  const body: Record<string, unknown> = {
    model: cfg.model || PROVIDERS.anthropic.defaultModel,
    max_tokens: cfg.maxTokens ?? 1024,
    messages: nonSystem,
  };
  if (system) body.system = system;
  if (tools?.length) {
    body.tools = tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
  }

  const res = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": cfg.apiKey || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data: any = await res.json();

  const textBlock = data.content?.find((b: any) => b.type === "text");
  const toolBlocks = data.content?.filter((b: any) => b.type === "tool_use") ?? [];

  return {
    content: textBlock?.text || "",
    tool_calls: toolBlocks.map((b: any) => ({
      function: { name: b.name, arguments: b.input },
    })),
    promptTokens: data.usage?.input_tokens,
    completionTokens: data.usage?.output_tokens,
  };
}

export async function testAIProvider(cfg: AICallConfig): Promise<{ ok: boolean; latencyMs: number; response?: string; error?: string }> {
  const start = Date.now();
  try {
    const result = await callAI(
      [{ role: "user", content: "Say hi in one sentence." }],
      { ...cfg, maxTokens: 50 }
    );
    return { ok: true, latencyMs: Date.now() - start, response: result.content };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - start, error: (e as Error).message };
  }
}
