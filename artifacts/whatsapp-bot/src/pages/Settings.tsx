import { useState, useEffect } from "react";
import { 
  useGetBotConfig, useUpdateBotConfig, 
  useGetOllamaConfig, useUpdateOllamaConfig, 
  useListOllamaModels, useTestOllamaConnection 
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Server, Save, Loader2, PlayCircle, CheckCircle2, AlertCircle, CreditCard, Globe } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Settings() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure bot behavior and AI models.</p>
      </div>

      <Tabs defaultValue="bot" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="bot" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
            <Bot className="w-4 h-4 mr-2" /> Bot Profile
          </TabsTrigger>
          <TabsTrigger value="ollama" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
            <Server className="w-4 h-4 mr-2" /> Ollama AI
          </TabsTrigger>
        </TabsList>
        <TabsContent value="bot">
          <BotConfigForm />
        </TabsContent>
        <TabsContent value="ollama">
          <OllamaConfigForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BotConfigForm() {
  const { data, isLoading } = useGetBotConfig();
  const queryClient = useQueryClient();
  const updateMut = useUpdateBotConfig({ mutation: { onSuccess: () => queryClient.invalidateQueries({queryKey: ['/api/bot/config']}) } });

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (data) setFormData(data);
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMut.mutate({ data: formData });
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <Card className="bg-card/40 backdrop-blur-sm border-border/50 shadow-xl">
      <CardHeader>
        <CardTitle className="font-display">Business Profile & Behavior</CardTitle>
        <CardDescription>How the bot presents itself to customers.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Business Name</label>
              <Input 
                value={formData.businessName || ''} 
                onChange={e => setFormData({...formData, businessName: e.target.value})}
                className="bg-background border-border/50"
              />
            </div>
            <div className="flex items-center gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50">
              <Switch 
                checked={formData.autoReply || false} 
                onCheckedChange={c => setFormData({...formData, autoReply: c})} 
              />
              <div>
                <label className="text-sm font-bold text-foreground">Enable AI Auto-Reply</label>
                <p className="text-xs text-muted-foreground">Let AI handle incoming messages.</p>
              </div>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Welcome Message</label>
              <Textarea 
                value={formData.welcomeMessage || ''} 
                onChange={e => setFormData({...formData, welcomeMessage: e.target.value})}
                className="bg-background border-border/50 min-h-[100px]"
                placeholder="Hi! How can I help you today?"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">System Prompt (AI Persona)</label>
              <Textarea 
                value={formData.systemPrompt || ''} 
                onChange={e => setFormData({...formData, systemPrompt: e.target.value})}
                className="bg-background border-border/50 min-h-[150px] font-mono text-sm text-primary"
                placeholder="You are a helpful sales assistant..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Working Hours Start</label>
              <Input type="time" value={formData.workingHoursStart || ''} onChange={e => setFormData({...formData, workingHoursStart: e.target.value})} className="bg-background border-border/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Working Hours End</label>
              <Input type="time" value={formData.workingHoursEnd || ''} onChange={e => setFormData({...formData, workingHoursEnd: e.target.value})} className="bg-background border-border/50" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Language</label>
              <Select value={formData.language || 'es'} onValueChange={v => setFormData({...formData, language: v})}>
                <SelectTrigger className="bg-background border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">🇲🇽 Español</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="pt">🇧🇷 Português</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CreditCard className="w-3.5 h-3.5" /> Payment Methods</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "cash", label: "💵 Efectivo / Cash" },
                  { id: "card", label: "💳 Tarjeta / Card" },
                  { id: "paypal", label: "🅿️ PayPal" },
                  { id: "mercadolibre", label: "🛒 MercadoLibre" },
                ].map(pm => {
                  const methods: string[] = formData.paymentMethods || [];
                  const checked = methods.includes(pm.id);
                  return (
                    <div key={pm.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${checked ? 'bg-primary/10 border-primary/30' : 'bg-secondary/30 border-border/50'}`}
                      onClick={() => {
                        const updated = checked ? methods.filter((m: string) => m !== pm.id) : [...methods, pm.id];
                        setFormData({...formData, paymentMethods: updated});
                      }}>
                      <Switch checked={checked} onCheckedChange={() => {}} tabIndex={-1} />
                      <span className="text-sm font-medium text-foreground">{pm.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <Button type="submit" disabled={updateMut.isPending} className="w-full sm:w-auto mt-4 shadow-lg shadow-primary/20">
            {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function OllamaConfigForm() {
  const { data: config, isLoading: loadingConfig } = useGetOllamaConfig();
  const { data: modelsData, isLoading: loadingModels } = useListOllamaModels();
  const queryClient = useQueryClient();
  const updateMut = useUpdateOllamaConfig({ mutation: { onSuccess: () => queryClient.invalidateQueries({queryKey: ['/api/ollama/config']}) } });
  const testMut = useTestOllamaConnection();

  const [formData, setFormData] = useState<any>({});
  const [testMsg, setTestMsg] = useState("Say hello in one short sentence.");

  useEffect(() => {
    if (config) setFormData(config);
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMut.mutate({ data: {
      url: formData.url,
      model: formData.model,
      temperature: Number(formData.temperature),
      maxTokens: Number(formData.maxTokens)
    }});
  };

  if (loadingConfig || loadingModels) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card className="bg-card/40 backdrop-blur-sm border-border/50 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display">Ollama Connection</CardTitle>
              <CardDescription>Connect to your EasyPanel Ollama instance.</CardDescription>
            </div>
            <div className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${config?.connected ? 'bg-primary/10 text-primary border-primary/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
              {config?.connected ? <><CheckCircle2 className="w-3 h-3" /> Connected</> : <><AlertCircle className="w-3 h-3" /> Disconnected</>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Ollama Endpoint URL</label>
                <Input 
                  required
                  value={formData.url || ''} 
                  onChange={e => setFormData({...formData, url: e.target.value})}
                  className="bg-background border-border/50 font-mono"
                  placeholder="https://n8n-ollama.ginee6.easypanel.host"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Model</label>
                <Select value={formData.model} onValueChange={v => setFormData({...formData, model: v})}>
                  <SelectTrigger className="bg-background border-border/50">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelsData?.models.map(m => (
                      <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                    ))}
                    {!modelsData?.models.length && <SelectItem value="custom" disabled>No models found</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex justify-between">
                  <span>Temperature</span>
                  <span className="text-primary">{formData.temperature}</span>
                </label>
                <input 
                  type="range" 
                  min="0" max="1" step="0.1" 
                  value={formData.temperature || 0.7}
                  onChange={e => setFormData({...formData, temperature: Number(e.target.value)})}
                  className="w-full accent-primary"
                />
              </div>
            </div>
            
            <Button type="submit" disabled={updateMut.isPending} className="w-full sm:w-auto shadow-lg shadow-primary/20">
              {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Configuration
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Test Section */}
      <Card className="bg-card/40 backdrop-blur-sm border-border/50 shadow-xl">
         <CardHeader>
          <CardTitle className="font-display text-lg">Test Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input 
              value={testMsg}
              onChange={e => setTestMsg(e.target.value)}
              className="bg-background border-border/50"
            />
            <Button onClick={() => testMut.mutate({ data: { message: testMsg } })} disabled={testMut.isPending || !config?.model} variant="secondary" className="border border-border/50">
               {testMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PlayCircle className="w-4 h-4 mr-2" />}
               Run Test
            </Button>
          </div>

          {testMut.data && (
             <div className="mt-4 p-4 bg-background/50 rounded-xl border border-border/50 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
               <div className="flex justify-between items-start mb-2">
                 <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">AI Response</span>
                 <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded font-mono">{testMut.data.latencyMs}ms</span>
               </div>
               <p className="text-sm text-foreground whitespace-pre-wrap">{testMut.data.response}</p>
             </div>
          )}
          {testMut.isError && (
             <div className="mt-4 p-4 bg-destructive/10 rounded-xl border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2">
               <AlertCircle className="w-4 h-4" /> Failed to reach Ollama. Check URL and ensure model exists.
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
