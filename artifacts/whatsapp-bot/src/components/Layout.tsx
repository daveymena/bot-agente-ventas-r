import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  ShoppingBag, 
  Zap, 
  Settings, 
  Bot,
  LogOut,
  BrainCircuit,
  Code2,
  BookMarked,
} from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: MessageSquare, label: "Conversations", href: "/conversations" },
  { icon: Users, label: "Contacts", href: "/contacts" },
  { icon: ShoppingBag, label: "Products", href: "/products" },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

const agentNavItems = [
  { icon: BrainCircuit, label: "Agent", href: "/agent" },
  { icon: Code2, label: "Skills", href: "/skills" },
  { icon: BookMarked, label: "Memory", href: "/memory" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-border/50 bg-card/50 backdrop-blur-xl flex flex-col z-20 shadow-2xl shadow-black/50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
            <Bot className="text-primary-foreground w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-foreground leading-tight">OpenClaw</h1>
            <p className="text-xs text-muted-foreground font-medium">Sales Assistant</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <p className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-widest px-4 mb-2">WhatsApp Bot</p>
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group
                  ${isActive 
                    ? "text-primary font-medium" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}
                `}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeNav" 
                    className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={`w-5 h-5 relative z-10 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground transition-colors"}`} />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
          
          <div className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-widest px-4 mb-2">OpenClaw Agent</p>
            {agentNavItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group
                    ${isActive 
                      ? "text-primary font-medium" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}
                  `}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavAgent" 
                      className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className={`w-5 h-5 relative z-10 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground transition-colors"}`} />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-border/50">
          <button className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-200">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Subtle background glow effect */}
        <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
        
        <div className="flex-1 overflow-y-auto z-10 p-6 md:p-8">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="h-full max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
