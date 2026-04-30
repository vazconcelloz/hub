import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PropostaAuto, AutoCotacao, formatCurrency } from "@/lib/proposal-auto-utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Car, Shield, FileCheck } from "lucide-react";
import heroBg from "@/assets/proposta-hero-bg.jpg";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const fmtBR = (v: number | null) => (v == null ? "—" : formatCurrency(v));

const FieldRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 py-2 border-b border-white/10 last:border-0">
    <span className="text-xs uppercase tracking-wide text-amber-200/70">{label}</span>
    <span className="text-right text-sm font-medium text-white">{value || "—"}</span>
  </div>
);

export default function PublicPropostaAutoPage() {
  const { slug } = useParams();
  const [proposta, setProposta] = useState<PropostaAuto | null>(null);
  const [cards, setCards] = useState<AutoCotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      if (!slug) return setNotFound(true);
      const { data: p } = await supabase.from("propostas_auto").select("*").eq("slug", slug).maybeSingle();
      if (!p) { setNotFound(true); setLoading(false); return; }
      setProposta(p);
      const { data: cs } = await supabase
        .from("proposta_auto_seguradoras")
        .select("*")
        .eq("proposta_id", p.id)
        .order("ordem_exibicao");
      setCards(cs || []);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[hsl(220_70%_8%)] text-white">Carregando...</div>;
  if (notFound || !proposta) return <div className="min-h-screen flex items-center justify-center bg-[hsl(220_70%_8%)] text-white">Proposta não encontrada</div>;

  const tel = (proposta.consultora_telefone || "").replace(/\D/g, "");
  const wppMsg = encodeURIComponent(`Olá! Vi minha proposta de seguro auto (${proposta.nome_cliente}) e gostaria de mais informações.`);
  const wppHref = tel ? `https://wa.me/55${tel}?text=${wppMsg}` : "#";

  return (
    <div className="min-h-screen bg-[hsl(220_70%_8%)] text-white">
      {/* Hero */}
      <header className="relative bg-cover bg-center" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="absolute inset-0 bg-[hsl(220_70%_8%/0.65)]" aria-hidden />
        <div className="container relative py-10 md:py-14 max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-2 text-amber-300/90 text-sm mb-2">
            <Car className="w-4 h-4" /> Cotação de Seguro Auto
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Proposta para {proposta.nome_cliente}</h1>
          {proposta.veiculo_marca_modelo && (
            <p className="text-amber-200/90 mt-2 text-lg">🚗 {proposta.veiculo_marca_modelo}</p>
          )}
          {proposta.validade_proposta && (
            <p className="text-white/70 text-sm mt-2">
              Válida até {format(new Date(proposta.validade_proposta), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          )}
        </div>
      </header>

      {/* Cards */}
      <main className="container max-w-6xl mx-auto px-4 py-10">
        {cards.length === 0 ? (
          <Card className="p-10 text-center bg-white/5 border-white/10 text-white">
            Nenhuma cotação cadastrada ainda.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cards.map((c) => (
              <Card
                key={c.id}
                className="bg-gradient-to-b from-[hsl(220_50%_15%)] to-[hsl(220_60%_10%)] border border-amber-500/20 text-white p-5 flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-amber-300/80">{c.seguradora_nome}</p>
                    <h3 className="text-lg font-semibold mt-0.5">{c.produto_nome || "Cotação"}</h3>
                  </div>
                  {c.destaque_comercial && (
                    <Badge className="bg-amber-500 text-amber-950 hover:bg-amber-500">{c.destaque_comercial}</Badge>
                  )}
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-amber-200/80">Prêmio total</p>
                  <p className="text-3xl font-bold text-amber-300 mt-1">{fmtBR(c.premio_total)}</p>
                  {c.parcelamento && <p className="text-xs text-white/70 mt-1">{c.parcelamento}</p>}
                </div>

                <div className="space-y-0 mb-3">
                  <FieldRow label="Cobertura" value={c.cobertura_resumo} />
                  <FieldRow label="Franquia" value={c.franquia_valor != null ? `${fmtBR(c.franquia_valor)}${c.franquia_tipo ? ` · ${c.franquia_tipo}` : ""}` : c.franquia_tipo} />
                  <FieldRow label="% FIPE" value={c.percentual_fipe} />
                  <FieldRow label="Danos materiais" value={fmtBR(c.danos_materiais)} />
                  <FieldRow label="Danos corporais" value={fmtBR(c.danos_corporais)} />
                  <FieldRow label="Danos morais" value={fmtBR(c.danos_morais)} />
                  <FieldRow label="APP morte/invalidez" value={fmtBR(c.app_morte_invalidez)} />
                  <FieldRow label="Assistência 24h" value={c.assistencia_24h} />
                  <FieldRow label="Vidros" value={c.vidros} />
                  <FieldRow label="Carro reserva" value={c.carro_reserva} />
                </div>

                {c.formas_pagamento && (
                  <p className="text-xs text-white/60 mt-auto pt-2 border-t border-white/10">
                    <FileCheck className="w-3 h-3 inline mr-1" /> {c.formas_pagamento}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* CTA WhatsApp */}
        {tel && (
          <div className="text-center mt-12">
            <Button asChild size="lg" className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold text-base px-8 py-6 rounded-full shadow-lg shadow-amber-500/20">
              <a href={wppHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-5 h-5 mr-2" /> Falar com {proposta.consultora_nome || "consultor(a)"}
              </a>
            </Button>
            <p className="text-white/60 text-xs mt-3">Tire suas dúvidas e contrate pelo WhatsApp</p>
          </div>
        )}

        {proposta.observacoes_gerais && (
          <Card className="mt-10 bg-white/5 border-white/10 text-white p-5">
            <div className="flex items-center gap-2 mb-2 text-amber-300/90">
              <Shield className="w-4 h-4" />
              <h4 className="font-semibold">Observações</h4>
            </div>
            <p className="text-sm text-white/80 whitespace-pre-line">{proposta.observacoes_gerais}</p>
          </Card>
        )}
      </main>

      <footer className="text-center text-white/40 text-xs py-6">
        Grupo FBN — Seguros, Crédito e Investimentos
      </footer>
    </div>
  );
}
