import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, BookMarked, Trash2, Loader2, Tag, Search } from "lucide-react";
import { format } from "date-fns";

type Memory = {
  id: string;
  key: string;
  value: string;
  tags: string;
  source: string;
  createdAt: string;
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, opts);
  return res.json();
}

export default function Memory() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadMemories();
  }, []);

  async function loadMemories() {
    setLoading(true);
    const data = await apiFetch("/memory");
    setMemories(data.memories || []);
    setLoading(false);
  }

  async function deleteMemory(id: string) {
    setDeletingId(id);
    await apiFetch(`/memory/${id}`, { method: "DELETE" });
    await loadMemories();
    setDeletingId(null);
  }

  const filtered = memories.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.key.toLowerCase().includes(q) || m.value.toLowerCase().includes(q) || (m.tags || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Memory</h1>
          <p className="text-muted-foreground mt-1">Persistent facts and notes the Agent can recall.</p>
        </div>
        <MemoryDialog onSave={loadMemories} />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search memories by key, value or tag..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-card/50 border-border/50"
        />
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span><span className="font-bold text-foreground">{memories.length}</span> total memories</span>
        {search && <span>· <span className="font-bold text-foreground">{filtered.length}</span> matching search</span>}
        <span className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Agent-saved
          <span className="w-2 h-2 rounded-full bg-secondary border border-border inline-block ml-2" /> Manual
        </span>
      </div>

      {loading && <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}

      {!loading && filtered.length === 0 && (
        <div className="py-16 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl bg-card/20">
          <BookMarked className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-bold text-foreground">No memories yet</h3>
          <p className="mt-1 text-sm">Ask the Agent to save memories, or add them manually.</p>
          <p className="mt-1 text-xs font-mono text-primary">Try: "Save a memory that our store hours are 9am to 6pm"</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(m => (
          <div key={m.id} className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-5 hover:border-primary/20 transition-all group relative">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.source === "agent" ? "bg-primary" : "bg-muted-foreground"}`} />
                  <h3 className="font-bold text-sm text-foreground truncate">{m.key}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{m.value}</p>
                {m.tags && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {m.tags.split(",").filter(Boolean).map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 text-[10px] font-medium bg-secondary px-2 py-0.5 rounded-full text-muted-foreground border border-border/50">
                        <Tag className="w-2.5 h-2.5" /> {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => deleteMemory(m.id)}
                disabled={deletingId === m.id}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-all flex-shrink-0"
              >
                {deletingId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${m.source === "agent" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                {m.source}
              </span>
              <span className="text-[10px] text-muted-foreground">{format(new Date(m.createdAt), "MMM d, yyyy HH:mm")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemoryDialog({ onSave }: { onSave: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ key: "", value: "", tags: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await apiFetch("/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setOpen(false);
    setForm({ key: "", value: "", tags: "" });
    onSave();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg shadow-primary/20"><Plus className="w-4 h-4" /> Add Memory</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>Save a Memory</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Key / Label</label>
            <Input
              required
              value={form.key}
              onChange={e => setForm({ ...form, key: e.target.value })}
              placeholder="e.g. Store working hours"
              className="bg-background border-border/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Value</label>
            <textarea
              required
              value={form.value}
              onChange={e => setForm({ ...form, value: e.target.value })}
              placeholder="The full information to remember..."
              className="w-full h-28 bg-background border border-border/50 rounded-xl p-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Tags (comma separated)</label>
            <Input
              value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })}
              placeholder="e.g. business, schedule, important"
              className="bg-background border-border/50"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Memory
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
