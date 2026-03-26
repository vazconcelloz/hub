import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Proposta, STATUS_LABELS, STATUS_COLORS } from "@/lib/proposal-utils";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Search, Eye, Copy, Pencil, FileText, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    fetchPropostas();
  }, [user]);

  const fetchPropostas = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("propostas")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setPropostas(data || []);
    }
    setLoading(false);
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/cotacao/${slug}`);
    toast({ title: "Link copiado!", description: "O link da proposta foi copiado." });
  };

  const duplicarProposta = async (proposta: Proposta) => {
    const { generateSlug } = await import("@/lib/proposal-utils");
    const newSlug = generateSlug();
    const { data: newProposta, error } = await supabase
      .from("propostas")
      .insert({
        user_id: user!.id,
        nome_cliente: proposta.nome_cliente + " (cópia)",
        telefone_cliente: proposta.telefone_cliente,
        cidade: proposta.cidade,
        estado: proposta.estado,
        tipo_produto: proposta.tipo_produto,
        faixa_etaria_ou_perfil: proposta.faixa_etaria_ou_perfil,
        consultora_nome: proposta.consultora_nome,
        consultora_telefone: proposta.consultora_telefone,
        consultora_foto_url: proposta.consultora_foto_url,
        validade_proposta: proposta.validade_proposta,
        observacoes_gerais: proposta.observacoes_gerais,
        status: "pendente",
        slug: newSlug,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    // Copy operadoras
    const { data: ops } = await supabase
      .from("proposta_operadoras")
      .select("*")
      .eq("proposta_id", proposta.id);

    if (ops && ops.length > 0 && newProposta) {
      await supabase.from("proposta_operadoras").insert(
        ops.map((op) => ({
          proposta_id: newProposta.id,
          operadora_nome: op.operadora_nome,
          plano_nome: op.plano_nome,
          valor_mensal: op.valor_mensal,
          coparticipacao: op.coparticipacao,
          acomodacao: op.acomodacao,
          abrangencia: op.abrangencia,
          reembolso: op.reembolso,
          resumo_cobertura: op.resumo_cobertura,
          rede_credenciada_resumo: op.rede_credenciada_resumo,
          destaque_comercial: op.destaque_comercial,
          ordem_exibicao: op.ordem_exibicao,
          pdf_url: op.pdf_url,
        }))
      );
    }

    toast({ title: "Proposta duplicada!" });
    fetchPropostas();
  };

  const deleteProposta = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta proposta?")) return;
    const { error } = await supabase.from("propostas").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Proposta excluída" });
      fetchPropostas();
    }
  };

  const markAsViewed = async (id: string) => {
    await supabase.from("propostas").update({ status: "visualizada" }).eq("id", id);
    toast({ title: "Status atualizado" });
    fetchPropostas();
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Propostas</h1>
            <p className="text-muted-foreground text-sm">Gerencie suas cotações e propostas</p>
          </div>
          <Button onClick={() => navigate("/admin/proposta/nova")} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Nova Proposta
          </Button>
        </div>

        {/* Stats */}
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
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

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhuma proposta encontrada</p>
            <Button onClick={() => navigate("/admin/proposta/nova")} className="mt-4">
              <Plus className="w-4 h-4 mr-2" /> Criar primeira proposta
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <Card key={p.id} className="p-4 hover:shadow-card-hover transition-shadow">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">{p.nome_cliente}</h3>
                      <Badge className={`text-xs ${STATUS_COLORS[p.status]}`}>
                        {STATUS_LABELS[p.status]}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {p.cidade && <span>{p.cidade}{p.estado ? ` - ${p.estado}` : ""}</span>}
                      {p.tipo_produto && <span>• {p.tipo_produto}</span>}
                      <span>• {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/proposta/${p.id}`)} title="Editar">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => window.open(`/cotacao/${p.slug}`, "_blank")} title="Visualizar">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => copyLink(p.slug)} title="Copiar link">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => duplicarProposta(p)} title="Duplicar">
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => markAsViewed(p.id)} title="Marcar como visualizada">
                      <Eye className="w-4 h-4 text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteProposta(p.id)} title="Excluir">
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
