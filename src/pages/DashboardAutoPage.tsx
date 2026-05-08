import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/db";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Eye, Copy, Pencil, FileText, Trash2, Car } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PropostaAuto,
  generateSlug,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/proposal-auto-utils";

export default function DashboardAutoPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [propostas, setPropostas] = useState<PropostaAuto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    fetch();
  }, []);

  const fetch = async () => {
    const { data, error } = await db
      .from("propostas_auto")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else setPropostas(data || []);
    setLoading(false);
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/cotacao-auto/${slug}`);
    toast({ title: "Link copiado!" });
  };

  const duplicar = async (p: PropostaAuto) => {
    const newSlug = generateSlug();
    const { data: nova, error } = await db
      .from("propostas_auto")
      .insert({
        nome_cliente: p.nome_cliente + " (cópia)",
        telefone_cliente: p.telefone_cliente,
        veiculo_marca_modelo: p.veiculo_marca_modelo,
        consultora_nome: p.consultora_nome,
        consultora_telefone: p.consultora_telefone,
        consultora_foto_url: p.consultora_foto_url,
        validade_proposta: p.validade_proposta,
        observacoes_gerais: p.observacoes_gerais,
        status: "pendente",
        slug: newSlug,
      })
      .select()
      .single();
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    const { data: cards } = await db
      .from("proposta_auto_seguradoras")
      .select("*")
      .eq("proposta_id", p.id);
    if (cards && cards.length && nova) {
      await db.from("proposta_auto_seguradoras").insert(
        cards.map((c) => ({
          proposta_id: nova.id,
          seguradora_nome: c.seguradora_nome,
          produto_nome: c.produto_nome,
          premio_total: c.premio_total,
          cobertura_resumo: c.cobertura_resumo,
          franquia_valor: c.franquia_valor,
          franquia_tipo: c.franquia_tipo,
          percentual_fipe: c.percentual_fipe,
          danos_materiais: c.danos_materiais,
          danos_corporais: c.danos_corporais,
          danos_morais: c.danos_morais,
          app_morte_invalidez: c.app_morte_invalidez,
          assistencia_24h: c.assistencia_24h,
          vidros: c.vidros,
          carro_reserva: c.carro_reserva,
          parcelamento: c.parcelamento,
          formas_pagamento: c.formas_pagamento,
          destaque_comercial: c.destaque_comercial,
          ordem_exibicao: c.ordem_exibicao,
          cor_coluna: c.cor_coluna,
          pdf_url: c.pdf_url,
        }))
      );
    }
    toast({ title: "Proposta duplicada!" });
    fetch();
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir esta proposta?")) return;
    const { error } = await db.from("propostas_auto").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Proposta excluída" });
      fetch();
    }
  };

  const filtered = propostas
    .filter((p) => {
      if (search && !p.nome_cliente.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortOrder === "desc" ? db - da : da - db;
    });

  const stats = {
    total: propostas.length,
    pendentes: propostas.filter((p) => p.status === "pendente").length,
    enviadas: propostas.filter((p) => p.status === "enviada").length,
    fechadas: propostas.filter((p) => p.status === "fechada").length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Car className="w-6 h-6" /> Cotações de Automóvel
            </h1>
            <p className="text-muted-foreground text-sm">Gerencie suas propostas de seguro auto</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate("/app/cotacoes/automovel/proposta/nova?modo=manual")} size="lg" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Criar do zero
            </Button>
            <Button onClick={() => navigate("/app/cotacoes/automovel/proposta/nova")} size="lg">
              <FileText className="w-4 h-4 mr-2" />
              Importar PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Pendentes", value: stats.pendentes, color: "text-amber-600" },
            { label: "Enviadas", value: stats.enviadas, color: "text-blue-600" },
            { label: "Fechadas", value: stats.fechadas, color: "text-green-600" },
          ].map((s) => (
            <Card key={s.label} className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}>
            {sortOrder === "desc" ? "Mais recentes" : "Mais antigas"}
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Car className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhuma proposta encontrada</p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <Button onClick={() => navigate("/app/cotacoes/automovel/proposta/nova?modo=manual")} variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Criar do zero
              </Button>
              <Button onClick={() => navigate("/app/cotacoes/automovel/proposta/nova")}>
                <FileText className="w-4 h-4 mr-2" /> Importar PDF
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <Card key={p.id} className="p-4 hover:shadow-card-hover transition-shadow">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">{p.nome_cliente}</h3>
                      <Badge className={`text-xs ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {p.veiculo_marca_modelo && <span>🚗 {p.veiculo_marca_modelo}</span>}
                      <span>• {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/app/cotacoes/automovel/proposta/${p.id}`)} title="Editar">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/app/cotacoes/automovel/cotacao/${p.slug}`)} title="Visualizar">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => copyLink(p.slug)} title="Copiar link">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => duplicar(p)} title="Duplicar">
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => excluir(p.id)} title="Excluir">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
