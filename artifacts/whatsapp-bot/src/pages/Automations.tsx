import { useState } from "react";
import { useListAutomationRules, useCreateAutomationRule, useUpdateAutomationRule, useDeleteAutomationRule } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Zap, Workflow, Trash2, Edit2, Loader2, ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Automations() {
  const { data, isLoading } = useListAutomationRules();
  const queryClient = useQueryClient();
  const updateMut = useUpdateAutomationRule({ mutation: { onSuccess: () => queryClient.invalidateQueries({queryKey: ['/api/automation/rules']}) } });
  const deleteMut = useDeleteAutomationRule({ mutation: { onSuccess: () => queryClient.invalidateQueries({queryKey: ['/api/automation/rules']}) } });

  const toggleRule = (id: string, current: boolean) => {
    updateMut.mutate({ id, data: { enabled: !current } });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Automations</h1>
          <p className="text-muted-foreground mt-1">Define rules to automate actions based on triggers.</p>
        </div>
        <RuleDialog mode="create" />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-4">
          {(data?.rules ?? (Array.isArray(data) ? data : [])).map((rule: any) => (
            <Card key={rule.id} className={`bg-card/40 backdrop-blur-sm border-border/50 shadow-md transition-all ${!rule.enabled ? 'opacity-60' : ''}`}>
              <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="flex-shrink-0 pt-1 sm:pt-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${rule.enabled ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary text-muted-foreground border border-border'}`}>
                    <Zap className="w-6 h-6" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-foreground">{rule.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-secondary px-2.5 py-1 rounded border border-border/50 text-muted-foreground">
                      <Workflow className="w-3 h-3" /> {rule.trigger} {rule.triggerValue ? `"${rule.triggerValue}"` : ''}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded border border-primary/20">
                      {rule.action.replace('_', ' ')} {rule.actionValue ? `→ ${rule.actionValue}` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 ml-auto self-end sm:self-auto">
                  <div className="flex items-center gap-2 mr-4">
                    <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id, rule.enabled)} disabled={updateMut.isPending} />
                    <span className="text-sm font-medium text-muted-foreground">{rule.enabled ? 'Active' : 'Paused'}</span>
                  </div>
                  <RuleDialog mode="edit" rule={rule} trigger={
                    <Button variant="ghost" size="icon" className="hover:bg-secondary"><Edit2 className="w-4 h-4" /></Button>
                  } />
                  <Button variant="ghost" size="icon" className="hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteMut.mutate({ id: rule.id })} disabled={deleteMut.isPending}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(data?.rules ?? (Array.isArray(data) ? data : [])).length === 0 && (
            <div className="py-16 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl bg-card/20">
              <Workflow className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-bold text-foreground">No automations yet</h3>
              <p className="mt-1">Create rules to automate your workflow without AI intervention.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RuleDialog({ mode, rule, trigger }: { mode: 'create' | 'edit', rule?: any, trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: rule?.name || "",
    trigger: rule?.trigger || "keyword",
    triggerValue: rule?.triggerValue || "",
    action: rule?.action || "send_message",
    actionValue: rule?.actionValue || "",
    enabled: rule?.enabled ?? true,
    priority: rule?.priority || 1
  });

  const createMut = useCreateAutomationRule({ mutation: { onSuccess: () => { setOpen(false); queryClient.invalidateQueries({queryKey: ['/api/automation/rules']}); } } });
  const updateMut = useUpdateAutomationRule({ mutation: { onSuccess: () => { setOpen(false); queryClient.invalidateQueries({queryKey: ['/api/automation/rules']}); } } });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      createMut.mutate({ data: formData as any });
    } else {
      updateMut.mutate({ id: rule.id, data: formData as any });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="gap-2 shadow-lg shadow-primary/20"><Plus className="w-4 h-4" /> New Rule</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Rule' : 'Edit Rule'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Rule Name</label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-background border-border/50" placeholder="e.g. Auto-reply hello" />
          </div>
          
          <div className="p-4 rounded-xl border border-border/50 bg-secondary/30 space-y-4">
            <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-2"><Workflow className="w-4 h-4 text-primary" /> WHEN</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Condition</label>
                <Select value={formData.trigger} onValueChange={v => setFormData({...formData, trigger: v})}>
                  <SelectTrigger className="bg-background border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">Message contains keyword</SelectItem>
                    <SelectItem value="first_message">First time messaging</SelectItem>
                    <SelectItem value="purchase">On Purchase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Value (Optional)</label>
                <Input value={formData.triggerValue} onChange={e => setFormData({...formData, triggerValue: e.target.value})} className="bg-background border-border/50" placeholder="e.g. 'price'" />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/50 bg-primary/5 space-y-4">
            <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> THEN DO</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Action</label>
                <Select value={formData.action} onValueChange={v => setFormData({...formData, action: v})}>
                  <SelectTrigger className="bg-background border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send_message">Send Auto-Reply</SelectItem>
                    <SelectItem value="send_catalog">Send Catalog</SelectItem>
                    <SelectItem value="tag_contact">Add Tag</SelectItem>
                    <SelectItem value="assign_stage">Change Stage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Action Value</label>
                <Input value={formData.actionValue} onChange={e => setFormData({...formData, actionValue: e.target.value})} className="bg-background border-border/50" placeholder="e.g. 'Hello there!'" />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Rule
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
