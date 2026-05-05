import { Shield } from "lucide-react";

import {
  usePropostaData,
  AdminToolbar,
  PropostaHero,
  ComparativeTable,
  MobileCards,
  CompareBar,
  CompareDialog,
  Observacoes,
  ConsultoraCTA,
  FloatingWhatsApp,
} from "@/components/proposta-publica";

export default function PublicPropostaPage() {
  const { loading, notFound, ctx } = usePropostaData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-lg">Carregando sua proposta...</div>
      </div>
    );
  }

  if (notFound || !ctx) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <Shield className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Proposta não encontrada</h1>
        <p className="text-muted-foreground">O link pode estar incorreto ou a proposta não está mais disponível.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <AdminToolbar ctx={ctx} />
      <PropostaHero ctx={ctx} />

      {/* Desktop: one comparative table per carrier */}
      <section className="container py-8 md:py-10 hidden md:block space-y-8">
        {ctx.grupos.map((g) => (
          <div key={g.nome} className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{g.nome}</h2>
              </div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {g.planos.length} {g.planos.length === 1 ? "plano" : "planos"}
              </span>
            </div>
            <ComparativeTable ctx={ctx} ops={g.planos} />
          </div>
        ))}
      </section>

      {/* Mobile: card layout */}
      <MobileCards ctx={ctx} />

      <Observacoes ctx={ctx} />
      <ConsultoraCTA ctx={ctx} />
      <CompareBar ctx={ctx} />
      <CompareDialog ctx={ctx} />
      <FloatingWhatsApp ctx={ctx} />

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>Proposta preparada com ❤️ pela sua corretora de confiança</p>
      </footer>
    </div>
  );
}
