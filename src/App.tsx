import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound.tsx";
import DashboardPage from "./pages/DashboardPage";
import PropostaFormPage from "./pages/PropostaFormPage";
import PublicPropostaPage from "./pages/PublicPropostaPage";
import CatalogoPage from "./pages/CatalogoPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/catalogo" element={<CatalogoPage />} />
            <Route path="/admin" element={<DashboardPage />} />
            <Route path="/admin/proposta/:id" element={<PropostaFormPage />} />
            <Route path="/admin/catalogo" element={<CatalogoPage />} />
            <Route path="/admin/cotacao/:slug" element={<PublicPropostaPage />} />
            <Route path="/cotacao/:slug" element={<PublicPropostaPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
