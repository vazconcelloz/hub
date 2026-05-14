import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// ——— Eagerly loaded (small, always needed) ———
import NotFound from "./pages/NotFound";
import RequireAuth from "./components/RequireAuth";
import RequirePermission from "./components/RequirePermission";
import HubLayout from "./components/HubLayout";

// ——— Lazily loaded pages ———
const LoginPage = lazy(() => import("./pages/LoginPage"));
const InicioPage = lazy(() => import("./pages/InicioPage"));
const CotacoesIndexPage = lazy(() => import("./pages/CotacoesIndexPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const DashboardAutoPage = lazy(() => import("./pages/DashboardAutoPage"));
const PropostaFormPage = lazy(() => import("./pages/PropostaFormPage"));
const PropostaAutoFormPage = lazy(() => import("./pages/PropostaAutoFormPage"));
const PublicPropostaPage = lazy(() => import("./pages/PublicPropostaPage"));
const PublicPropostaAutoPage = lazy(() => import("./pages/PublicPropostaAutoPage"));
const CatalogoPage = lazy(() => import("./pages/CatalogoPage"));
const TreinamentosPage = lazy(() => import("./pages/TreinamentosPage"));
const ManuaisPage = lazy(() => import("./pages/ManuaisPage"));
const SegmentacoesPage = lazy(() => import("./pages/SegmentacoesPage"));
const RDStationMappingPage = lazy(() => import("./pages/RDStationMappingPage"));
const ConfiguracoesPage = lazy(() => import("./pages/ConfiguracoesPage"));
const UsuariosPage = lazy(() => import("./pages/UsuariosPage"));

// ——— Suspense fallback ———
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

// ——— Legacy redirects ———
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 2 minutes — avoids redundant db calls
      staleTime: 2 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Don't refetch on tab focus — user data doesn't change that fast
      refetchOnWindowFocus: false,
      // Retry once on failure, then give up
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/cotacao/:slug" element={<PublicPropostaPage />} />
                <Route path="/cotacao-auto/:slug" element={<PublicPropostaAutoPage />} />

                {/* Authenticated hub */}
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
                    path="/app/segmentacoes/rd-mapping"
                    element={
                      <RequirePermission permission="segmentacoes.ver">
                        <RDStationMappingPage />
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
                  {/* Auto */}
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
                  {/* Legacy redirects */}
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

                {/* Compat redirects */}
                <Route path="/" element={<Navigate to="/app" replace />} />
                <Route path="/admin" element={<Navigate to="/app/cotacoes/saude" replace />} />
                <Route path="/admin/proposta/:id" element={<RedirectPropostaLegacy />} />
                <Route path="/admin/catalogo" element={<Navigate to="/app/cotacoes/saude/catalogo" replace />} />
                <Route path="/catalogo" element={<Navigate to="/app/cotacoes/saude/catalogo" replace />} />
                <Route path="/admin/cotacao/:slug" element={<RedirectCotacaoLegacy />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
