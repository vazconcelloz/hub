import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  PropostaAuto,
  AutoCotacao,
  formatCurrency,
} from "@/lib/proposal-auto-utils";
import {
  DESTAQUE_LABELS,
  DESTAQUE_COLORS,
  getColunaColor,
} from "@/lib/proposal-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Shield,
  MessageCircle,
  Car,
  Calendar,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import heroBg from "@/assets/proposta-hero-bg.jpg";

const fmt = (v: number | null | undefined) =>
  v == null ? "—" : formatCurrency(v);
const txt = (v: string | null | undefined) =>
  v && v.trim() ? v : "—";

interface Criterio {
  label: string;
  render: (c: AutoCotacao) => React.ReactNode;
}

const CRITERIOS: Criterio[] = [
  { label: "Cobertura", render: (c) => txt(c.cobertura_resumo) },
  {
    label: "Franquia",
    render: (c) =>
      c.franquia_valor != null
        ? `${fmt(c.franquia_valor)}${c.franquia_tipo ? ` · ${c.franquia_tipo}` : ""}`
        : txt(c.franquia_tipo),
  },
  { label: "% FIPE / Indenização", render: (c) => txt(c.percentual_fipe) },
  { label: "Danos materiais", render: (c) => fmt(c.danos_materiais) },
  { label: "Danos corporais", render: (c) => fmt(c.danos_corporais) },
  { label: "Danos morais", render: (c) => fmt(c.danos_morais) },
  { label: "APP morte/invalidez", render: (c) => fmt(c.app_morte_invalidez) },
  { label: "Assistência 24h", render: (c) => txt(c.assistencia_24h) },
  { label: "Vidros", render: (c) => txt(c.vidros) },
  { label: "Carro reserva", render: (c) => txt(c.carro_reserva) },
];

export default function PublicPropostaAutoPage() {
  const { slug } = useParams();
  const [proposta, setProposta] = useState<PropostaAuto | null>(null);
  const [cotacoes, setCotacoes] = useState<AutoCotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { data: p } = await supabase
        .from("propostas_auto")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!p) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProposta(p);
      const { data: cs } = await supabase
        .from("proposta_auto_seguradoras")
        .select("*")
        .eq("proposta_id", p.id)
        .order("ordem_exibicao");
      setCotacoes(cs || []);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-lg">
          Carregando sua proposta...
        </div>
      </div>
    );
  }

  if (notFound || !proposta) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <Shield className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Proposta não encontrada
        </h1>
        <p className="text-muted-foreground">
          O link pode estar incorreto ou a proposta não está mais disponível.
        </p>
      </div>
    );
  }

  const tel = (proposta.consultora_telefone || "").replace(/\D/g, "");
  const whatsappHref = tel
    ? `https://wa.me/${tel.length <= 11 ? "55" + tel : tel}?text=${encodeURIComponent(
        `Olá! Vi minha proposta de seguro auto e gostaria de mais informações.`
      )}`
    : "#";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero */}
      <header
        className="relative text-primary-foreground bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-[hsl(220_70%_8%/0.55)]" aria-hidden />
        <div className="container relative py-8 md:py-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-white/10 backdrop-blur flex items-center justify-center mb-2">
            <Car className="w-7 h-7" />
          </div>
          <p className="text-xs uppercase tracking-widest opacity-80">
            Cotação de Seguro Auto
          </p>
          <h1 className="text-2xl md:text-4xl font-bold">
            Comparativo de Seguradoras
          </h1>
          <p className="text-base md:text-lg opacity-90 max-w-xl mx-auto">
            Olá, <span className="font-semibold">{proposta.nome_cliente}</span>!
            Confira lado a lado as melhores opções para o seu veículo.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm opacity-80 pt-2">
            {proposta.veiculo_marca_modelo && (
              <span className="flex items-center gap-1">
                <Car className="w-4 h-4" /> {proposta.veiculo_marca_modelo}
              </span>
            )}
            {proposta.validade_proposta && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Válida até{" "}
                {format(new Date(proposta.validade_proposta), "dd/MM/yyyy", {
                  locale: ptBR,
                })}
              </span>
            )}
          </div>
        </div>
      </header>

      {cotacoes.length === 0 ? (
        <section className="container py-16 text-center">
          <Card className="p-10 max-w-lg mx-auto">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">
              Nenhuma cotação cadastrada ainda.
            </p>
          </Card>
        </section>
      ) : (
        <>
          {/* Tabela comparativa (desktop) */}
          <section className="container py-8 md:py-10 hidden md:block">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-3 font-semibold text-foreground w-48">
                      Critério
                    </th>
                    {cotacoes.map((c) => (
                      <th
                        key={c.id}
                        className="px-4 py-4 text-center align-bottom min-w-[200px]"
                      >
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            {c.seguradora_nome}
                          </p>
                          <p className="font-bold text-foreground">
                            {txt(c.produto_nome)}
                          </p>
                          {c.destaque_comercial && (
                            <Badge className="bg-primary text-primary-foreground mt-1">
                              {c.destaque_comercial}
                            </Badge>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-primary/5">
                    <th className="text-left px-4 py-3 font-semibold text-foreground">
                      Prêmio total
                    </th>
                    {cotacoes.map((c) => (
                      <th key={c.id} className="px-4 py-3 text-center">
                        <p className="text-xl font-bold text-primary">
                          {fmt(c.premio_total)}
                        </p>
                        {c.parcelamento && (
                          <p className="text-xs text-muted-foreground font-normal mt-0.5">
                            {c.parcelamento}
                          </p>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CRITERIOS.map((crit, i) => (
                    <tr
                      key={crit.label}
                      className={i % 2 ? "bg-muted/20" : ""}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {crit.label}
                      </td>
                      {cotacoes.map((c) => (
                        <td
                          key={c.id}
                          className="px-4 py-3 text-center text-muted-foreground"
                        >
                          {crit.render(c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {cotacoes.some((c) => c.formas_pagamento) && (
                    <tr>
                      <td className="px-4 py-3 font-medium text-foreground">
                        Formas de pagamento
                      </td>
                      {cotacoes.map((c) => (
                        <td
                          key={c.id}
                          className="px-4 py-3 text-center text-xs text-muted-foreground"
                        >
                          {txt(c.formas_pagamento)}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Cards (mobile) */}
          <section className="container py-6 md:hidden space-y-4">
            {cotacoes.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {c.seguradora_nome}
                    </p>
                    <h3 className="font-bold text-foreground">
                      {txt(c.produto_nome)}
                    </h3>
                  </div>
                  {c.destaque_comercial && (
                    <Badge className="bg-primary text-primary-foreground">
                      {c.destaque_comercial}
                    </Badge>
                  )}
                </div>
                <div className="bg-primary/5 rounded-lg p-3 text-center mb-4">
                  <p className="text-xs uppercase text-muted-foreground">
                    Prêmio total
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {fmt(c.premio_total)}
                  </p>
                  {c.parcelamento && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.parcelamento}
                    </p>
                  )}
                </div>
                <dl className="space-y-2 text-sm">
                  {CRITERIOS.map((crit) => (
                    <div
                      key={crit.label}
                      className="flex justify-between gap-3 border-b border-border/60 pb-1.5 last:border-0"
                    >
                      <dt className="text-muted-foreground">{crit.label}</dt>
                      <dd className="text-right text-foreground font-medium">
                        {crit.render(c)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>
            ))}
          </section>
        </>
      )}

      {/* CTA WhatsApp */}
      {tel && (
        <section className="container py-8 text-center">
          <Button
            asChild
            size="lg"
            className="px-8 py-6 text-base rounded-full shadow-lg"
          >
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-5 h-5 mr-2" />
              Falar com {proposta.consultora_nome || "consultor(a)"}
            </a>
          </Button>
          <p className="text-muted-foreground text-xs mt-3">
            Tire suas dúvidas e contrate pelo WhatsApp
          </p>
        </section>
      )}

      {proposta.observacoes_gerais && (
        <section className="container max-w-3xl">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2 text-foreground">
              <Shield className="w-4 h-4 text-primary" />
              <h4 className="font-semibold">Observações</h4>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {proposta.observacoes_gerais}
            </p>
          </Card>
        </section>
      )}

      <footer className="text-center text-muted-foreground text-xs py-8">
        Grupo FBN — Seguros, Crédito e Investimentos
      </footer>
    </div>
  );
}
