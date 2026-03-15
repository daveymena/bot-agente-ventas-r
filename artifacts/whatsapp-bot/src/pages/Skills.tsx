import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Code2, Trash2, Play, Loader2, CheckCircle2, XCircle, Edit2 } from "lucide-react";

type Skill = {
  id: string;
  name: string;
  description: string;
  code: string;
  parametersSchema: string;
  enabled: boolean;
  createdAt: string;
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, opts);
  return res.json();
}

const EXAMPLE_SKILLS = [
  {
    name: "get_weather",
    description: "Fetch current weather for a city using a public API",
    code: `const city = params.city || "Mexico City";
const res = await fetch(\`https://wttr.in/\${encodeURIComponent(city)}?format=j1\`);
const data = await res.json();
const w = data.current_condition?.[0];
return {
  city,
  temp_C: w?.temp_C,
  feels_like_C: w?.FeelsLikeC,
  description: w?.weatherDesc?.[0]?.value,
  humidity: w?.humidity
};`,
  },
  {
    name: "currency_convert",
    description: "Convert an amount between two currencies using a free API",
    code: `const { amount = 1, from = "USD", to = "MXN" } = params;
const res = await fetch(\`https://api.exchangerate-api.com/v4/latest/\${from}\`);
const data = await res.json();
const rate = data.rates?.[to];
if (!rate) return { error: "Currency not found" };
return { from, to, amount, result: (amount * rate).toFixed(2), rate };`,
  },
  {
    name: "send_webhook",
    description: "Send a POST request to a webhook URL with a custom payload",
    code: `const { url, message, data: extraData = {} } = params;
if (!url) return { error: "url parameter is required" };
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message, timestamp: new Date().toISOString(), ...extraData })
});
return { status: res.status, ok: res.ok, response: await res.text() };`,
  },
];

export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [runResults, setRunResults] = useState<Record<string, { success: boolean; output: unknown; error?: string; durationMs: number }>>({});
  const [runningId, setRunningId] = useState<string | null>(null);
  const [testParams, setTestParams] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSkills();
  }, []);

  async function loadSkills() {
    setLoading(true);
    const data = await apiFetch("/skills");
    setSkills(data.skills || []);
    setLoading(false);
  }

  async function toggleSkill(id: string, current: boolean) {
    await apiFetch(`/skills/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !current }),
    });
    loadSkills();
  }

  async function deleteSkill(id: string) {
    if (!confirm("Delete this skill?")) return;
    await apiFetch(`/skills/${id}`, { method: "DELETE" });
    loadSkills();
  }

  async function runSkill(id: string) {
    setRunningId(id);
    const params = testParams[id] ? JSON.parse(testParams[id]) : {};
    const result = await apiFetch(`/skills/${id}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ params }),
    });
    setRunResults(prev => ({ ...prev, [id]: result }));
    setRunningId(null);
  }

  async function addExampleSkill(ex: typeof EXAMPLE_SKILLS[0]) {
    await apiFetch("/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: ex.name, description: ex.description, code: ex.code }),
    });
    loadSkills();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Skills</h1>
          <p className="text-muted-foreground mt-1">Custom JavaScript automations the Agent can run.</p>
        </div>
        <SkillDialog onSave={loadSkills} />
      </div>

      {skills.length === 0 && !loading && (
        <div>
          <div className="py-8 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl bg-card/20 mb-6">
            <Code2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-foreground">No skills yet</h3>
            <p className="mt-1 text-sm">Create custom JavaScript functions the Agent can execute.</p>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Quick-add example skills:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {EXAMPLE_SKILLS.map(ex => (
                <div key={ex.name} className="bg-card/40 border border-border/50 rounded-xl p-4 hover:border-primary/30 transition-colors">
                  <h4 className="font-bold text-sm font-mono text-primary">{ex.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">{ex.description}</p>
                  <Button size="sm" variant="secondary" className="w-full" onClick={() => addExampleSkill(ex)}>
                    <Plus className="w-3 h-3 mr-1" /> Add this skill
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}

      <div className="space-y-4">
        {skills.map(skill => (
          <div key={skill.id} className={`bg-card/40 backdrop-blur-sm border rounded-2xl p-5 transition-all ${skill.enabled ? 'border-border/50' : 'border-border/30 opacity-60'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-lg font-mono text-primary">{skill.name}</h3>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${skill.enabled ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary text-muted-foreground border-border'}`}>
                    {skill.enabled ? "Active" : "Disabled"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{skill.description}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch checked={skill.enabled} onCheckedChange={() => toggleSkill(skill.id, skill.enabled)} />
                <SkillDialog skill={skill} onSave={loadSkills} />
                <Button variant="ghost" size="icon" className="hover:text-destructive hover:bg-destructive/10" onClick={() => deleteSkill(skill.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <pre className="text-xs bg-background/50 rounded-xl p-4 border border-border/30 overflow-x-auto text-muted-foreground font-mono max-h-40 overflow-y-auto">
                {skill.code}
              </pre>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Input
                className="flex-1 font-mono text-xs bg-background border-border/50"
                placeholder='Test params as JSON, e.g. {"city": "Mexico City"}'
                value={testParams[skill.id] || ""}
                onChange={e => setTestParams(prev => ({ ...prev, [skill.id]: e.target.value }))}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => runSkill(skill.id)}
                disabled={runningId === skill.id}
                className="gap-2"
              >
                {runningId === skill.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Run
              </Button>
            </div>

            {runResults[skill.id] && (
              <div className={`mt-3 p-4 rounded-xl border text-xs font-mono ${runResults[skill.id].success ? 'bg-primary/5 border-primary/20' : 'bg-destructive/10 border-destructive/20'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {runResults[skill.id].success
                    ? <CheckCircle2 className="w-3 h-3 text-primary" />
                    : <XCircle className="w-3 h-3 text-destructive" />}
                  <span className={`font-bold uppercase text-[10px] tracking-wider ${runResults[skill.id].success ? 'text-primary' : 'text-destructive'}`}>
                    {runResults[skill.id].success ? "Success" : "Error"} · {runResults[skill.id].durationMs}ms
                  </span>
                </div>
                <pre className="whitespace-pre-wrap break-all text-foreground">
                  {runResults[skill.id].error || JSON.stringify(runResults[skill.id].output, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillDialog({ skill, onSave }: { skill?: Skill; onSave: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: skill?.name || "",
    description: skill?.description || "",
    code: skill?.code || `// Write your async JavaScript skill here
// Use 'params' to access input parameters
// Use 'fetch' for HTTP requests
// Return any value — it will be shown to the agent

const result = "Hello from " + (params.name || "OpenClaw");
return result;`,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (skill) {
      await apiFetch(`/skills/${skill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await apiFetch("/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setSaving(false);
    setOpen(false);
    onSave();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {skill ? (
          <Button variant="ghost" size="icon" className="hover:bg-secondary"><Edit2 className="w-4 h-4" /></Button>
        ) : (
          <Button className="gap-2 shadow-lg shadow-primary/20"><Plus className="w-4 h-4" /> New Skill</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>{skill ? "Edit Skill" : "Create New Skill"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Skill Name (no spaces)</label>
              <Input
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value.replace(/\s+/g, "_") })}
                placeholder="my_skill_name"
                className="bg-background border-border/50 font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <Input
                required
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="What does this skill do?"
                className="bg-background border-border/50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">JavaScript Code</label>
            <textarea
              required
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value })}
              className="w-full h-64 bg-background border border-border/50 rounded-xl p-4 text-sm font-mono text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {skill ? "Update" : "Create"} Skill
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
