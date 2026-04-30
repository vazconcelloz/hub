import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Heart, Car, Shield, Home, ArrowRight } from "lucide-react";

const ramos = [
  {
    title: "Saúde",
    desc: "Propostas comparativas de planos de saúde",
    url: "/app/cotacoes/saude",
    icon: Heart,
    enabled: true,
  },
  {
    title: "Automóvel",
    desc: "Cotações de seguro auto",
    url: "#",
    icon: Car,
    enabled: false,
  },
  {
    title: "Vida",
    desc: "Cotações de seguro de vida",
    url: "#",
    icon: Shield,
    enabled: false,
  },
  {
    title: "Residencial",
    desc: "Cotações de seguro residencial",
    url: "#",
    icon: Home,
    enabled: false,
  },
];

export default function CotacoesIndexPage() {
  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-[hsl(var(--hub-text))]">Cotações</h1>
        <p className="text-[hsl(var(--hub-text-muted))] mt-1">
          Selecione o ramo para iniciar uma cotação.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ramos.map((r) => {
          const content = (
            <Card
              className={`p-5 border-[hsl(var(--hub-border))] bg-[hsl(var(--hub-surface))] h-full transition-colors ${
                r.enabled
                  ? "hover:border-[hsl(var(--hub-primary))] group cursor-pointer"
                  : "opacity-60 cursor-not-allowed"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--hub-surface-muted))] flex items-center justify-center text-[hsl(var(--hub-primary))]">
                  <r.icon className="w-5 h-5" />
                </div>
                <ArrowRight
                  className={`w-4 h-4 text-[hsl(var(--hub-text-muted))] ${
                    r.enabled ? "group-hover:text-[hsl(var(--hub-primary))] transition-colors" : ""
                  }`}
                />
              </div>
              <h3 className="font-semibold text-[hsl(var(--hub-text))]">{r.title}</h3>
              <p className="text-sm text-[hsl(var(--hub-text-muted))] mt-1">{r.desc}</p>
              {!r.enabled && (
                <span className="inline-block mt-3 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-[hsl(var(--hub-surface-muted))] text-[hsl(var(--hub-text-muted))]">
                  Em breve
                </span>
              )}
            </Card>
          );
          return r.enabled ? (
            <Link key={r.title} to={r.url}>
              {content}
            </Link>
          ) : (
            <div key={r.title}>{content}</div>
          );
        })}
      </section>
    </div>
  );
}
