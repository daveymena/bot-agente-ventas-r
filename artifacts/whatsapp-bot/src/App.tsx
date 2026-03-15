import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Conversations from "@/pages/Conversations";
import Contacts from "@/pages/Contacts";
import Products from "@/pages/Products";
import Automations from "@/pages/Automations";
import Settings from "@/pages/Settings";
import Agent from "@/pages/Agent";
import Skills from "@/pages/Skills";
import Memory from "@/pages/Memory";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/conversations" component={Conversations} />
        <Route path="/contacts" component={Contacts} />
        <Route path="/products" component={Products} />
        <Route path="/automations" component={Automations} />
        <Route path="/settings" component={Settings} />
        <Route path="/agent" component={Agent} />
        <Route path="/skills" component={Skills} />
        <Route path="/memory" component={Memory} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
