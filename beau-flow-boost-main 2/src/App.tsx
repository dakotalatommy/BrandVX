import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useLeadAutomation } from "@/hooks/useLeadAutomation";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import Agent from "./pages/Agent";
import Integrations from "./pages/Integrations";
import HubSpotCallback from "./pages/HubSpotCallback";
import AcuityCallback from "./pages/AcuityCallback";
import SquareCallback from "./pages/SquareCallback";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Navigation from "./components/Navigation";

const queryClient = new QueryClient();

function AppContent() {
  const { user } = useAuth();
  useLeadAutomation(); // Initialize lead status automation
  
  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 lg:ml-64">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/home" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/integrations/hubspot/callback" element={<HubSpotCallback />} />
          <Route path="/integrations/acuity/callback" element={<AcuityCallback />} />
          <Route path="/integrations/square/callback" element={<SquareCallback />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/agent" element={<Agent />} />
          <Route path="/admin" element={<Admin />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
