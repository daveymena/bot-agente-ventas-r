import { Link, useLocation } from "wouter";
import { useState } from "react";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  ShoppingBag, 
  Settings, 
  Bot,
  LogOut,
  BrainCircuit,
  Menu,
  X,
  Layers
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: MessageSquare, label: "Conversations", href: "/conversations" },
  { icon: Users, label: "Contacts", href: "/contacts" },
  { icon: ShoppingBag, label: "Products", href: "/products" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

const agentNavItems = [
  { icon: BrainCircuit, label: "Hermes Agent", href: "/agent" },
  { icon: Layers, label: "AI Providers", href: "/ai-providers" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      
      {/* Mobile Topbar */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-xl border-b border-border/50 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Bot className="text-primary w-6 h-6" />
          <h1 className="font-display font-bold text-lg text-foreground">VentaFlow</h1>
        </div>
        <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="p-2 bg-secondary rounded-lg text-foreground">
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm top-16"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 mt-16 md:mt-0
        w-72 flex-shrink-0 border-r border-border/50 bg-card/95 backdrop-blur-xl flex flex-col shadow-2xl shadow-black/50
        transition-transform duration-300 ease-in-out md:translate-x-0
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="p-6 items-center gap-3 hidden md:flex">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
            <Bot className="text-primary-foreground w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-foreground leading-tight">VentaFlow</h1>
            <p className="text-xs text-muted-foreground font-medium">Sistema de Ventas</p>
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
            <p className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-widest px-4 mb-2">VentaFlow Agent</p>
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
      <main className="flex-1 flex flex-col overflow-hidden relative pt-16 md:pt-0">
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
