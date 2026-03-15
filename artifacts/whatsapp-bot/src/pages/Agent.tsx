import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrainCircuit, Send, Trash2, Plus, ChevronRight, Loader2, Wrench, ChevronDown } from "lucide-react";

type ToolCall = {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
};

type AgentMsg = {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  timestamp: string;
};

type Session = {
  id: string;
  title: string;
  updatedAt: string;
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${BASE}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}
async function apiGet(path: string) {
  const res = await fetch(`${BASE}/api${path}`);
  return res.json();
}
async function apiDelete(path: string) {
  const res = await fetch(`${BASE}/api${path}`, { method: "DELETE" });
  return res.json();
}

export default function Agent() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadSessions() {
    const data = await apiGet("/agent/sessions");
    setSessions(data.sessions || []);
  }

  async function loadSession(id: string) {
    setLoadingSession(true);
    setActiveSessionId(id);
    const data = await apiGet(`/agent/sessions/${id}`);
    setMessages(data.messages || []);
    setLoadingSession(false);
  }

  async function newSession() {
    setActiveSessionId(null);
    setMessages([]);
  }

  async function deleteSession(id: string) {
    await apiDelete(`/agent/sessions/${id}`);
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages([]);
    }
    loadSessions();
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setLoading(true);

    const optimisticMsg: AgentMsg = { role: "user", content: userMsg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, optimisticMsg]);

    const data = await apiPost("/agent/chat", { message: userMsg, sessionId: activeSessionId });

    if (data.sessionId && !activeSessionId) {
      setActiveSessionId(data.sessionId);
      await loadSessions();
    } else if (data.sessionId) {
      await loadSessions();
    }

    setMessages(data.messages || []);
    setLoading(false);
  }

  function toggleTool(key: string) {
    setExpandedTools(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 overflow-hidden shadow-2xl shadow-black/20">
      {/* Sidebar - Sessions */}
      <div className="w-72 flex-shrink-0 border-r border-border/50 flex flex-col bg-card/30">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-primary" /> OpenClaw Agent
            </h2>
          </div>
          <Button onClick={newSession} className="w-full gap-2 shadow-lg shadow-primary/20" size="sm">
            <Plus className="w-4 h-4" /> New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 && (
            <div className="text-center text-muted-foreground text-sm p-6">
              No sessions yet. Start a new chat!
            </div>
          )}
          {sessions.map(s => (
            <div
              key={s.id}
              className={`group flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${activeSessionId === s.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-secondary/50'}`}
              onClick={() => loadSession(s.id)}
            >
              <div className="flex-1 overflow-hidden">
                <p className={`text-sm font-medium truncate ${activeSessionId === s.id ? 'text-primary' : 'text-foreground'}`}>{s.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(s.updatedAt).toLocaleDateString()}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-border/50 flex items-center px-6 bg-card/50 backdrop-blur-md gap-3">
          <BrainCircuit className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              {activeSessionId ? sessions.find(s => s.id === activeSessionId)?.title || "Session" : "New Chat"}
            </h3>
            <p className="text-xs text-muted-foreground">Powered by Ollama · Uses 10 built-in tools</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingSession ? (
            <div className="flex justify-center pt-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-2xl shadow-primary/20">
                <BrainCircuit className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground">OpenClaw Agent</h2>
              <p className="mt-2 text-sm max-w-md">Ask me anything. I can search the web, query your database, call APIs, save memories, and run custom skills.</p>
              <div className="mt-6 grid grid-cols-2 gap-3 max-w-lg w-full">
                {[
                  "Search for the latest iPhone 17 price",
                  "How many customers do we have in VIP stage?",
                  "What products are currently in stock?",
                  "Save a memory: our best selling product is the MacBook Pro",
                ].map(ex => (
                  <button
                    key={ex}
                    onClick={() => { setInput(ex); }}
                    className="text-left text-xs p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight className="w-3 h-3 inline mr-1 text-primary" />{ex}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.filter(m => m.role !== "tool").map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" ? (
                  <div className="max-w-[80%] space-y-3">
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="space-y-2">
                        {msg.toolCalls.map((tc, ti) => {
                          const key = `${i}-${ti}`;
                          const expanded = expandedTools.has(key);
                          return (
                            <div key={ti} className="bg-secondary/50 border border-border/50 rounded-xl overflow-hidden text-xs">
                              <button
                                onClick={() => toggleTool(key)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-secondary/80 transition-colors"
                              >
                                <Wrench className="w-3 h-3 text-primary flex-shrink-0" />
                                <span className="font-mono font-bold text-primary">{tc.name}</span>
                                <span className="text-muted-foreground ml-auto">
                                  {expanded ? "▲" : "▼"}
                                </span>
                              </button>
                              {expanded && (
                                <div className="px-4 pb-3 space-y-2 border-t border-border/30">
                                  <div>
                                    <p className="text-[10px] uppercase text-muted-foreground font-bold mt-2 mb-1">Input</p>
                                    <pre className="text-muted-foreground whitespace-pre-wrap break-all">{JSON.stringify(tc.args, null, 2)}</pre>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Output</p>
                                    <pre className="text-foreground whitespace-pre-wrap break-all max-h-40 overflow-y-auto">{typeof tc.result === "string" ? tc.result : JSON.stringify(tc.result, null, 2)}</pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {msg.content && (
                      <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm px-5 py-4 shadow-md">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">{msg.content}</p>
                        <p className="text-[10px] text-muted-foreground mt-2">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="max-w-[70%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-5 py-4 shadow-md shadow-primary/25">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className="text-[10px] text-primary-foreground/70 mt-2">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Agent is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border/50 bg-card/80 backdrop-blur-xl">
          <form onSubmit={sendMessage} className="flex gap-3 max-w-5xl mx-auto">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask the agent to do anything..."
              disabled={loading}
              className="flex-1 bg-background border-border/50 rounded-full px-6 focus-visible:ring-primary/30"
            />
            <Button type="submit" disabled={!input.trim() || loading} size="icon" className="h-10 w-10 rounded-full shadow-lg shadow-primary/25 hover:scale-105 transition-transform">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
