import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { GraduationCap, BookOpen, Target, FileSpreadsheet, ArrowRight } from "lucide-react";

const modulos = [
  { title: "Cotações", desc: "Propostas comparativas de planos de saúde", url: "/app/cotacoes", icon: FileSpreadsheet },
  { title: "Treinamentos", desc: "Materiais e cursos para a equipe", url: "/app/treinamentos", icon: GraduationCap },
  { title: "Manuais", desc: "Documentos e procedimentos", url: "/app/manuais", icon: BookOpen },
  { title: "Segmentações", desc: "Listas e campanhas segmentadas", url: "/app/segmentacoes", icon: Target },
];

export default function InicioPage() {
  const [email, setEmail] = useState("");
  const [stats, setStats] = useState({ propostas: 0, treinamentos: 0, manuais: 0 });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const e = data.user?.email ?? "";
      setEmail(e.split("@")[0]);
    });
    Promise.all([
      supabase.from("propostas").select("id", { count: "exact", head: true }),
      supabase.from("treinamentos").select("id", { count: "exact", head: true }),
      supabase.from("manuais").select("id", { count: "exact", head: true }),
    ]).then(([p, t, m]) => {
      setStats({ propostas: p.count ?? 0, treinamentos: t.count ?? 0, manuais: m.count ?? 0 });
    });
  }, []);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-[hsl(var(--hub-text))]">
          Olá{email ? `, ${email}` : ""}
        </h1>
        <p className="text-[hsl(var(--hub-text-muted))] mt-1">Bem-vindo ao Hub Grupo FBN.</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Card className="p-5 border-[hsl(var(--hub-border))] bg-[hsl(var(--hub-surface))]">
          <p className="text-xs uppercase tracking-wide text-[hsl(var(--hub-text-muted))]">Propostas</p>
          <p className="text-3xl font-semibold text-[hsl(var(--hub-text))] mt-1">{stats.propostas}</p>
        </Card>
        <Card className="p-5 border-[hsl(var(--hub-border))] bg-[hsl(var(--hub-surface))]">
          <p className="text-xs uppercase tracking-wide text-[hsl(var(--hub-text-muted))]">Treinamentos</p>
          <p className="text-3xl font-semibold text-[hsl(var(--hub-text))] mt-1">{stats.treinamentos}</p>
        </Card>
        <Card className="p-5 border-[hsl(var(--hub-border))] bg-[hsl(var(--hub-surface))]">
          <p className="text-xs uppercase tracking-wide text-[hsl(var(--hub-text-muted))]">Manuais</p>
          <p className="text-3xl font-semibold text-[hsl(var(--hub-text))] mt-1">{stats.manuais}</p>
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[hsl(var(--hub-text))] mb-4">Módulos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modulos.map((m) => (
            <Link key={m.url} to={m.url}>
              <Card className="p-5 border-[hsl(var(--hub-border))] bg-[hsl(var(--hub-surface))] hover:border-[hsl(var(--hub-primary))] transition-colors group h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[hsl(var(--hub-surface-muted))] flex items-center justify-center text-[hsl(var(--hub-primary))]">
                    <m.icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-[hsl(var(--hub-text-muted))] group-hover:text-[hsl(var(--hub-primary))] transition-colors" />
                </div>
                <h3 className="font-semibold text-[hsl(var(--hub-text))]">{m.title}</h3>
                <p className="text-sm text-[hsl(var(--hub-text-muted))] mt-1">{m.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
