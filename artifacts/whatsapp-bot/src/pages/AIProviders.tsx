import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, Zap, Lock, Unlock, Play, Save, Github, Copy, ExternalLink } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ProviderModel = { id: string; name: string; tier: "free" | "paid" };
type Provider = {
  id: string;
  name: string;
  tier: "free" | "paid" | "both";
  description: string;
  requiresKey: boolean;
  defaultModel: string;
  models: ProviderModel[];
};

const TIER_COLORS = {
  free: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paid: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  both: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};
const TIER_LABELS = { free: "Free", paid: "Paid", both: "Free + Paid" };

const PROVIDER_ICONS: Record<string, string> = {
  ollama: "🦙",
  groq: "⚡",
  openrouter: "🔀",
  openai: "🤖",
  anthropic: "🧠",
  gemini: "✨",
  github: "🐙",
};

export default function AIProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [activeConfig, setActiveConfig] = useState<{ provider: string; model: string; hasKey: boolean; ollamaUrl: string } | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("ollama");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("https://n8n-ollama.ginee6.easypanel.host");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; latencyMs: number; response?: string; error?: string } | null>(null);
  const [saved, setSaved] = useState(false);

  // GitHub Device Flow state
  const [ghFlow, setGhFlow] = useState<{
    user_code: string;
    verification_uri: string;
    verification_uri_complete: string;
    device_code: string;
    interval: number;
    expires_in: number;
  } | null>(null);
  const [ghStatus, setGhStatus] = useState<"idle" | "starting" | "pending" | "authorized" | "expired" | "error">("idle");
  const [ghError, setGhError] = useState<string | null>(null);
  const [ghCopied, setGhCopied] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/ai/providers`)
      .then(r => r.json())
      .then(d => setProviders(d.providers))
      .catch(() => {});

    fetch(`${BASE}/api/ai/config`)
      .then(r => r.json())
      .then(d => {
        setActiveConfig(d);
        setSelectedProvider(d.provider);
        setModel(d.model);
        setOllamaUrl(d.ollamaUrl || "https://n8n-ollama.ginee6.easypanel.host");
        setApiKey(d.hasKey ? "***" : "");
      })
      .catch(() => {});
  }, []);

  const currentProvider = providers.find(p => p.id === selectedProvider);

  const handleProviderSelect = (id: string) => {
    setSelectedProvider(id);
    const p = providers.find(pr => pr.id === id);
    setModel(p?.defaultModel || "");
    setApiKey("");
    setTestResult(null);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`${BASE}/api/ai/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, apiKey, model, ollamaUrl }),
      });
      const data = await res.json();
      setActiveConfig(data);
      if (data.hasKey) setApiKey("***");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const startGithubFlow = async () => {
    setGhStatus("starting");
    setGhError(null);
    setGhFlow(null);
    try {
      const res = await fetch(`${BASE}/api/ai/github/device-start`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.device_code) {
        setGhStatus("error");
        setGhError(data.error || "No se pudo iniciar el flujo");
        return;
      }
      setGhFlow(data);
      setGhStatus("pending");
      // Abrir GitHub en nueva pestaña con el código pre-llenado
      window.open(data.verification_uri_complete, "_blank", "noopener,noreferrer");
      // Iniciar polling
      pollGithub(data.device_code, data.interval, Date.now() + data.expires_in * 1000);
    } catch (e: any) {
      setGhStatus("error");
      setGhError(e?.message || "Error de red");
    }
  };

  const pollGithub = async (device_code: string, interval: number, expiresAt: number) => {
    if (Date.now() > expiresAt) {
      setGhStatus("expired");
      return;
    }
    try {
      const res = await fetch(`${BASE}/api/ai/github/device-poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_code }),
      });
      const data = await res.json();
      if (data.ok && data.status === "authorized") {
        setGhStatus("authorized");
        setGhFlow(null);
        // Recargar config
        const cfgRes = await fetch(`${BASE}/api/ai/config`).then(r => r.json());
        setActiveConfig(cfgRes);
        setSelectedProvider(cfgRes.provider);
        setModel(cfgRes.model);
        setApiKey(cfgRes.hasKey ? "***" : "");
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        return;
      }
      // slow_down → aumentar intervalo, authorization_pending → seguir
      const nextInterval = data.status === "slow_down" ? (data.interval ?? interval + 5) : interval;
      setTimeout(() => pollGithub(device_code, nextInterval, expiresAt), nextInterval * 1000);
    } catch {
      setTimeout(() => pollGithub(device_code, interval, expiresAt), interval * 1000);
    }
  };

  const copyGhCode = async () => {
    if (!ghFlow) return;
    try {
      await navigator.clipboard.writeText(ghFlow.user_code);
      setGhCopied(true);
      setTimeout(() => setGhCopied(false), 2000);
    } catch {}
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${BASE}/api/ai/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, apiKey, model, ollamaUrl }),
      });
      setTestResult(await res.json());
    } catch {
      setTestResult({ ok: false, latencyMs: 0, error: "Network error" });
    }
    setTesting(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">AI Providers</h1>
        <p className="text-muted-foreground mt-1">
          Conecta modelos gratuitos o de pago. El proveedor activo se usa en el bot y el agente.
        </p>
      </div>

      {activeConfig && (
        <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-lg">
            {PROVIDER_ICONS[activeConfig.provider] ?? "🤖"}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              Proveedor activo: <span className="text-primary">{providers.find(p => p.id === activeConfig.provider)?.name ?? activeConfig.provider}</span>
            </p>
            <p className="text-xs text-muted-foreground">Modelo: {activeConfig.model}</p>
          </div>
          <div className="ml-auto">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${activeConfig.hasKey || activeConfig.provider === "ollama" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
              {activeConfig.hasKey || activeConfig.provider === "ollama" ? "✓ Configurado" : "⚠ Sin API Key"}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {providers.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => handleProviderSelect(p.id)}
            className={`text-left p-4 rounded-2xl border transition-all duration-200 ${selectedProvider === p.id ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/10" : "bg-card/40 border-border/50 hover:bg-secondary/30 hover:border-border"}`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{PROVIDER_ICONS[p.id] ?? "🤖"}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TIER_COLORS[p.tier]}`}>
                {TIER_LABELS[p.tier]}
              </span>
            </div>
            <p className="font-bold text-sm text-foreground">{p.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
            <div className="flex items-center gap-1 mt-2">
              {p.requiresKey ? <Lock className="w-3 h-3 text-muted-foreground/60" /> : <Unlock className="w-3 h-3 text-emerald-400" />}
              <span className="text-[10px] text-muted-foreground">{p.requiresKey ? "Requiere API Key" : "Sin API Key"}</span>
            </div>
          </button>
        ))}
      </div>

      {currentProvider && (
        <Card className="bg-card/40 backdrop-blur-sm border-border/50 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{PROVIDER_ICONS[currentProvider.id] ?? "🤖"}</span>
              <div>
                <CardTitle className="font-display">{currentProvider.name}</CardTitle>
                <CardDescription>{currentProvider.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {currentProvider.id === "ollama" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Ollama Endpoint URL</label>
                <Input
                  value={ollamaUrl}
                  onChange={e => setOllamaUrl(e.target.value)}
                  className="bg-background border-border/50 font-mono text-sm"
                  placeholder="https://n8n-ollama.ginee6.easypanel.host"
                />
              </div>
            )}

            {currentProvider.id === "github" ? (
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Github className="w-3.5 h-3.5" /> Autenticación con GitHub
                </label>

                {ghStatus === "authorized" || (activeConfig?.provider === "github" && activeConfig?.hasKey && !ghFlow) ? (
                  <div className="p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/20 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-emerald-400">Conectado a GitHub</p>
                      <p className="text-xs text-muted-foreground">Token guardado. GitHub Models está listo para usarse.</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={startGithubFlow} className="text-xs">
                      Reconectar
                    </Button>
                  </div>
                ) : ghFlow && ghStatus === "pending" ? (
                  <div className="p-5 rounded-xl border bg-secondary/20 border-border/50 space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Tu código de autorización:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-2xl font-mono font-bold tracking-[0.3em] text-primary bg-background border border-border/50 rounded-lg py-3 px-4 text-center">
                          {ghFlow.user_code}
                        </code>
                        <Button type="button" variant="secondary" size="icon" onClick={copyGhCode} className="border border-border/50">
                          {ghCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>1. Se abrió <a href={ghFlow.verification_uri_complete} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">github.com/login/device <ExternalLink className="w-3 h-3" /></a></p>
                      <p>2. Pega el código de arriba (o ya viene pre-llenado).</p>
                      <p>3. Autoriza la app. Esta página detectará automáticamente cuando lo hagas.</p>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">Esperando autorización...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Inicia sesión con tu cuenta de GitHub. Se generará un token automáticamente, sin necesidad de crear un PAT manualmente. Igual que VS Code.
                    </p>
                    <Button type="button" onClick={startGithubFlow} disabled={ghStatus === "starting"} className="gap-2 bg-[#24292e] hover:bg-[#1b1f23] text-white border border-border/50">
                      {ghStatus === "starting" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                      {ghStatus === "starting" ? "Iniciando..." : "Iniciar sesión con GitHub"}
                    </Button>
                    {ghStatus === "expired" && <p className="text-xs text-amber-400">El código expiró. Genera uno nuevo.</p>}
                    {ghStatus === "error" && ghError && <p className="text-xs text-destructive">{ghError}</p>}
                  </>
                )}
              </div>
            ) : currentProvider.requiresKey && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" /> API Key
                  {currentProvider.id === "groq" && (
                    <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-primary text-xs underline ml-1">Obtener gratis →</a>
                  )}
                  {currentProvider.id === "openrouter" && (
                    <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary text-xs underline ml-1">Obtener gratis →</a>
                  )}
                  {currentProvider.id === "gemini" && (
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary text-xs underline ml-1">Obtener gratis →</a>
                  )}
                </label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="bg-background border-border/50 font-mono text-sm"
                  placeholder={`sk-... o ${currentProvider.id}-...`}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Modelo</label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="bg-background border-border/50">
                  <SelectValue placeholder="Seleccionar modelo" />
                </SelectTrigger>
                <SelectContent>
                  {currentProvider.models.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${m.tier === "free" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                          {m.tier === "free" ? "FREE" : "PAID"}
                        </span>
                        {m.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {testResult && (
              <div className={`p-4 rounded-xl border ${testResult.ok ? "bg-emerald-500/10 border-emerald-500/20" : "bg-destructive/10 border-destructive/20"}`}>
                <div className="flex items-center gap-2 mb-1">
                  {testResult.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-destructive" />}
                  <span className={`text-sm font-bold ${testResult.ok ? "text-emerald-400" : "text-destructive"}`}>
                    {testResult.ok ? `Conexión exitosa • ${testResult.latencyMs}ms` : "Conexión fallida"}
                  </span>
                </div>
                {testResult.response && <p className="text-sm text-foreground mt-1 pl-6 italic">"{testResult.response}"</p>}
                {testResult.error && <p className="text-xs text-destructive mt-1 pl-6 font-mono">{testResult.error}</p>}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" onClick={handleTest} disabled={testing} variant="secondary" className="border border-border/50 gap-2">
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Probar Conexión
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving} className="gap-2 shadow-lg shadow-primary/20 flex-1 sm:flex-none">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? "¡Guardado!" : "Activar Proveedor"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: "⚡", title: "Groq (recomendado)", desc: "Modelos Llama 3 ultra-rápidos con capa gratuita generosa. Sin tarjeta de crédito.", href: "https://console.groq.com/keys", cta: "Obtener API Key gratis" },
          { icon: "🔀", title: "OpenRouter", desc: "200+ modelos con un solo API key. Varios modelos completamente gratuitos.", href: "https://openrouter.ai/keys", cta: "Registro gratuito" },
          { icon: "✨", title: "Google Gemini", desc: "Gemini Flash tiene capa gratuita generosa. Excellente relación calidad/precio.", href: "https://aistudio.google.com/app/apikey", cta: "API Key gratuita" },
        ].map(tip => (
          <div key={tip.title} className="p-4 rounded-2xl border border-border/50 bg-card/30 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{tip.icon}</span>
              <h3 className="font-bold text-sm text-foreground">{tip.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{tip.desc}</p>
            <a href={tip.href} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-medium">
              {tip.cta} →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
