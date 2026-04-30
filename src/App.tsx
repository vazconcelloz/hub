import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import NotFound from "./pages/NotFound.tsx";
import DashboardPage from "./pages/DashboardPage";
import PropostaFormPage from "./pages/PropostaFormPage";
import PublicPropostaPage from "./pages/PublicPropostaPage";
import CatalogoPage from "./pages/CatalogoPage";
import LoginPage from "./pages/LoginPage";
import HubLayout from "./components/HubLayout";
import RequireAuth from "./components/RequireAuth";
import InicioPage from "./pages/InicioPage";
import TreinamentosPage from "./pages/TreinamentosPage";
import ManuaisPage from "./pages/ManuaisPage";
import SegmentacoesPage from "./pages/SegmentacoesPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Pública */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cotacao/:slug" element={<PublicPropostaPage />} />

            {/* Hub autenticado */}
            <Route
              element={
                <RequireAuth>
                  <HubLayout />
                </RequireAuth>
              }
            >
              <Route path="/app" element={<InicioPage />} />
              <Route path="/app/treinamentos" element={<TreinamentosPage />} />
              <Route path="/app/manuais" element={<ManuaisPage />} />
              <Route path="/app/segmentacoes" element={<SegmentacoesPage />} />
              <Route path="/app/cotacoes" element={<DashboardPage />} />
              <Route path="/app/cotacoes/proposta/:id" element={<PropostaFormPage />} />
              <Route path="/app/cotacoes/catalogo" element={<CatalogoPage />} />
              <Route path="/app/cotacoes/cotacao/:slug" element={<PublicPropostaPage />} />
            </Route>

            {/* Redirects de compatibilidade */}
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/admin" element={<Navigate to="/app/cotacoes" replace />} />
            <Route path="/admin/proposta/:id" element={<RedirectPropostaLegacy />} />
            <Route path="/admin/catalogo" element={<Navigate to="/app/cotacoes/catalogo" replace />} />
            <Route path="/catalogo" element={<Navigate to="/app/cotacoes/catalogo" replace />} />
            <Route path="/admin/cotacao/:slug" element={<RedirectCotacaoLegacy />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

import { useParams } from "react-router-dom";
function RedirectPropostaLegacy() {
  const { id } = useParams();
  return <Navigate to={`/app/cotacoes/proposta/${id}`} replace />;
}
function RedirectCotacaoLegacy() {
  const { slug } = useParams();
  return <Navigate to={`/cotacao/${slug}`} replace />;
}

export default App;
