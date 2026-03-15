import { useEffect } from "react";
import { useGetMessageStats, useGetBotStatus, useConnectBot, useDisconnectBot, useGetBotQR } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Bot, Activity, Zap, Smartphone, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { QRCodeSVG } from "qrcode.react";

// Mock data for chart since stats endpoint only returns totals
const chartData = [
  { name: 'Mon', inbound: 400, outbound: 240, ai: 200 },
  { name: 'Tue', inbound: 300, outbound: 139, ai: 120 },
  { name: 'Wed', inbound: 200, outbound: 980, ai: 800 },
  { name: 'Thu', inbound: 278, outbound: 390, ai: 300 },
  { name: 'Fri', inbound: 189, outbound: 480, ai: 400 },
  { name: 'Sat', inbound: 239, outbound: 380, ai: 320 },
  { name: 'Sun', inbound: 349, outbound: 430, ai: 380 },
];

export default function Dashboard() {
  const { data: stats } = useGetMessageStats({ query: { refetchInterval: 10000 } });
  const { data: botStatus } = useGetBotStatus({ query: { refetchInterval: 3000 } });
  
  const { data: qrData } = useGetBotQR({ 
    query: { 
      enabled: botStatus?.status === 'qr_pending',
      refetchInterval: 3000 
    } 
  });

  const connectMutation = useConnectBot();
  const disconnectMutation = useDisconnectBot();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your WhatsApp Sales Bot performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Messages" 
          value={stats?.totalMessages?.toLocaleString() || "0"} 
          icon={MessageSquare} 
          trend="+12% from last week" 
        />
        <StatCard 
          title="AI Generated" 
          value={stats?.aiGenerated?.toLocaleString() || "0"} 
          icon={Bot} 
          trend={`${stats?.totalMessages ? Math.round((stats.aiGenerated / stats.totalMessages) * 100) : 0}% of total`} 
        />
        <StatCard 
          title="Active Chats" 
          value={stats?.activeConversations?.toString() || "0"} 
          icon={Activity} 
          trend="Live now" 
        />
        <StatCard 
          title="Avg Response Time" 
          value={`${stats?.avgResponseTimeMs ? Math.round(stats.avgResponseTimeMs / 1000) : 0}s`} 
          icon={Zap} 
          trend="Lightning fast" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card/40 backdrop-blur-sm border-border/50 shadow-xl shadow-black/10">
          <CardHeader>
            <CardTitle className="font-display font-bold text-xl flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Message Traffic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="ai" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorAi)" />
                  <Area type="monotone" dataKey="inbound" stroke="hsl(var(--muted-foreground))" strokeWidth={2} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-border/50 shadow-xl shadow-black/10 relative overflow-hidden transition-colors duration-500 ${botStatus?.connected ? 'bg-primary/5 border-primary/20' : 'bg-card/40'}`}>
          {botStatus?.connected && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[50px] pointer-events-none" />
          )}
          <CardHeader>
            <CardTitle className="font-display font-bold text-xl flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-foreground" />
              WhatsApp Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-4 pb-6 min-h-[300px]">
            
            {botStatus?.status === 'connected' && (
              <div className="text-center space-y-6 w-full">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary/30 shadow-[0_0_30px_rgba(37,211,102,0.3)]">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{botStatus.name || 'WhatsApp Bot'}</h3>
                  <p className="text-muted-foreground mt-1 font-mono">{botStatus.phone}</p>
                </div>
                <div className="p-4 bg-background/50 rounded-xl border border-border">
                  <p className="text-sm text-muted-foreground flex justify-between">
                    <span>Messages Handled:</span>
                    <span className="font-bold text-foreground">{botStatus.messagesHandled}</span>
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  className="w-full font-bold shadow-lg"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Disconnect Device
                </Button>
              </div>
            )}

            {botStatus?.status === 'disconnected' && (
              <div className="text-center space-y-6 w-full">
                <div className="w-20 h-20 mx-auto rounded-full bg-secondary flex items-center justify-center">
                  <Bot className="w-10 h-10 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Bot Offline</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-[200px] mx-auto">Connect your WhatsApp account to start automating responses.</p>
                </div>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending}
                >
                  {connectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Start Connection
                </Button>
              </div>
            )}

            {botStatus?.status === 'connecting' && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-secondary flex items-center justify-center relative">
                  <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <Smartphone className="w-8 h-8 text-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground animate-pulse">Initializing...</h3>
                <p className="text-sm text-muted-foreground">Preparing WhatsApp Web session</p>
              </div>
            )}

            {botStatus?.status === 'qr_pending' && (
              <div className="text-center space-y-6 w-full">
                <div className="bg-white p-4 rounded-2xl mx-auto inline-block shadow-xl">
                  {qrData?.qr ? (
                    <QRCodeSVG value={qrData.qr} size={180} fgColor="#0B141A" bgColor="#FFFFFF" />
                  ) : (
                    <div className="w-[180px] h-[180px] flex items-center justify-center bg-gray-100 rounded-lg">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Scan QR Code</h3>
                  <p className="text-sm text-muted-foreground mt-1">Open WhatsApp on your phone and link a device.</p>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend }: { title: string, value: string, icon: any, trend: string }) {
  return (
    <Card className="bg-card/40 backdrop-blur-sm border-border/50 shadow-xl shadow-black/5 hover:border-primary/30 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-3xl font-display font-bold text-foreground mt-2">{value}</h3>
          </div>
          <div className="p-3 bg-secondary rounded-xl">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
        <p className="text-xs text-primary font-medium mt-4 bg-primary/10 inline-block px-2 py-1 rounded-md">{trend}</p>
      </CardContent>
    </Card>
  );
}
