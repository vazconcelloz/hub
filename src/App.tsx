import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import NotFound from "./pages/NotFound.tsx";
import DashboardPage from "./pages/DashboardPage";
import CotacoesIndexPage from "./pages/CotacoesIndexPage";
import PropostaFormPage from "./pages/PropostaFormPage";
import PublicPropostaPage from "./pages/PublicPropostaPage";
import CatalogoPage from "./pages/CatalogoPage";
import DashboardAutoPage from "./pages/DashboardAutoPage";
import PropostaAutoFormPage from "./pages/PropostaAutoFormPage";
import PublicPropostaAutoPage from "./pages/PublicPropostaAutoPage";
import LoginPage from "./pages/LoginPage";
import HubLayout from "./components/HubLayout";
import RequireAuth from "./components/RequireAuth";
import RequirePermission from "./components/RequirePermission";
import InicioPage from "./pages/InicioPage";
import TreinamentosPage from "./pages/TreinamentosPage";
import ManuaisPage from "./pages/ManuaisPage";
import SegmentacoesPage from "./pages/SegmentacoesPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import UsuariosPage from "./pages/UsuariosPage";

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
            <Route path="/cotacao-auto/:slug" element={<PublicPropostaAutoPage />} />

            {/* Hub autenticado */}
            <Route
              element={
                <RequireAuth>
                  <HubLayout />
                </RequireAuth>
              }
            >
              <Route path="/app" element={<InicioPage />} />
              <Route
                path="/app/treinamentos"
                element={
                  <RequirePermission permission="treinamentos.ver">
                    <TreinamentosPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/app/manuais"
                element={
                  <RequirePermission permission="manuais.ver">
                    <ManuaisPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/app/segmentacoes"
                element={
                  <RequirePermission permission="segmentacoes.ver">
                    <SegmentacoesPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/app/cotacoes"
                element={
                  <RequirePermission permission="cotacoes.ver">
                    <CotacoesIndexPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/app/cotacoes/saude"
                element={
                  <RequirePermission permission="cotacoes.ver">
                    <DashboardPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/app/cotacoes/saude/proposta/:id"
                element={
                  <RequirePermission permission="cotacoes.ver">
                    <PropostaFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/app/cotacoes/saude/catalogo"
                element={
                  <RequirePermission permission="catalogo.ver">
                    <CatalogoPage />
                  </RequirePermission>
                }
              />
              <Route path="/app/cotacoes/saude/cotacao/:slug" element={<PublicPropostaPage />} />
              {/* Automóvel */}
              <Route
                path="/app/cotacoes/automovel"
                element={
                  <RequirePermission permission="cotacoes.ver">
                    <DashboardAutoPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/app/cotacoes/automovel/proposta/:id"
                element={
                  <RequirePermission permission="cotacoes.ver">
                    <PropostaAutoFormPage />
                  </RequirePermission>
                }
              />
              <Route path="/app/cotacoes/automovel/cotacao/:slug" element={<PublicPropostaAutoPage />} />
              {/* Compat: rotas antigas sem /saude */}
              <Route path="/app/cotacoes/proposta/:id" element={<RedirectPropostaLegacy />} />
              <Route path="/app/cotacoes/catalogo" element={<Navigate to="/app/cotacoes/saude/catalogo" replace />} />
              <Route path="/app/cotacoes/cotacao/:slug" element={<RedirectCotacaoSaudeLegacy />} />
              <Route
                path="/app/usuarios"
                element={
                  <RequirePermission adminOnly>
                    <UsuariosPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/app/configuracoes"
                element={
                  <RequirePermission permission="configuracoes.ver">
                    <ConfiguracoesPage />
                  </RequirePermission>
                }
              />
            </Route>

            {/* Redirects de compatibilidade */}
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/admin" element={<Navigate to="/app/cotacoes/saude" replace />} />
            <Route path="/admin/proposta/:id" element={<RedirectPropostaLegacy />} />
            <Route path="/admin/catalogo" element={<Navigate to="/app/cotacoes/saude/catalogo" replace />} />
            <Route path="/catalogo" element={<Navigate to="/app/cotacoes/saude/catalogo" replace />} />
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
  return <Navigate to={`/app/cotacoes/saude/proposta/${id}`} replace />;
}
function RedirectCotacaoLegacy() {
  const { slug } = useParams();
  return <Navigate to={`/cotacao/${slug}`} replace />;
}
function RedirectCotacaoSaudeLegacy() {
  const { slug } = useParams();
  return <Navigate to={`/app/cotacoes/saude/cotacao/${slug}`} replace />;
}

export default App;
