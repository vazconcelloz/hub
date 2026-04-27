import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Proposta,
  Operadora,
  formatCurrency,
  formatPhone,
  DESTAQUE_LABELS,
  DESTAQUE_COLORS,
  parseFaixasEtarias,
  parseIdades,
  calcularTotalPorFaixas,
} from "@/lib/proposal-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Shield, MessageCircle, FileText, MapPin, Calendar, Heart, Pencil, Save, X, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type EditableOperadoraField =
  | "operadora_nome"
  | "plano_nome"
  | "valor_mensal"
  | "coparticipacao"
  | "acomodacao"
  | "abrangencia"
  | "reembolso"
  | "resumo_cobertura"
  | "rede_credenciada_resumo"
  | "destaque_comercial";

export default function PublicPropostaPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Modo edição (apenas dono logado)
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftProposta, setDraftProposta] = useState<Proposta | null>(null);
  const [draftOperadoras, setDraftOperadoras] = useState<Operadora[]>([]);

  // Qualquer usuário autenticado no portal pode tentar editar.
  // O RLS do banco garante que só o dono real consegue salvar de fato.
  const canEdit = useMemo(() => !!user && !!proposta, [user, proposta]);

  useEffect(() => {
    loadProposta();
  }, [slug]);

  const loadProposta = async () => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const { data: prop } = await supabase.from("propostas").select("*").eq("slug", slug).single();
    if (!prop) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setProposta(prop);

    const { data: ops } = await supabase
      .from("proposta_operadoras")
      .select("*")
      .eq("proposta_id", prop.id)
      .order("ordem_exibicao");
    setOperadoras(ops || []);
    setLoading(false);
  };

  // ========= Edição =========
  const handleEnterEdit = () => {
    if (!proposta) return;
    setDraftProposta({ ...proposta });
    setDraftOperadoras(operadoras.map((o) => ({ ...o })));
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setDraftProposta(null);
    setDraftOperadoras([]);
  };

  const updateDraftProposta = <K extends keyof Proposta>(field: K, value: Proposta[K]) => {
    setDraftProposta((p) => (p ? { ...p, [field]: value } : p));
  };

  const updateDraftOperadora = (id: string, field: EditableOperadoraField, value: any) => {
    setDraftOperadoras((ops) =>
      ops.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  };

  const handleSave = async () => {
    if (!draftProposta || !proposta) return;
    setSaving(true);
    try {
      // Atualiza proposta (cabeçalho)
      const { error: e1 } = await supabase
        .from("propostas")
        .update({
          nome_cliente: draftProposta.nome_cliente,
          cidade: draftProposta.cidade,
          estado: draftProposta.estado,
          tipo_produto: draftProposta.tipo_produto,
          validade_proposta: draftProposta.validade_proposta,
        })
        .eq("id", proposta.id);
      if (e1) throw e1;

      // Atualiza cada operadora alterada
      for (const draft of draftOperadoras) {
        const original = operadoras.find((o) => o.id === draft.id);
        if (!original) continue;
        const changed =
          original.operadora_nome !== draft.operadora_nome ||
          original.plano_nome !== draft.plano_nome ||
          original.valor_mensal !== draft.valor_mensal ||
          original.coparticipacao !== draft.coparticipacao ||
          original.acomodacao !== draft.acomodacao ||
          original.abrangencia !== draft.abrangencia ||
          original.reembolso !== draft.reembolso ||
          original.resumo_cobertura !== draft.resumo_cobertura ||
          original.rede_credenciada_resumo !== draft.rede_credenciada_resumo ||
          original.destaque_comercial !== draft.destaque_comercial;
        if (!changed) continue;

        const { error: e2 } = await supabase
          .from("proposta_operadoras")
          .update({
            operadora_nome: draft.operadora_nome,
            plano_nome: draft.plano_nome,
            valor_mensal: draft.valor_mensal,
            coparticipacao: draft.coparticipacao,
            acomodacao: draft.acomodacao,
            abrangencia: draft.abrangencia,
            reembolso: draft.reembolso,
            resumo_cobertura: draft.resumo_cobertura,
            rede_credenciada_resumo: draft.rede_credenciada_resumo,
            destaque_comercial: draft.destaque_comercial,
          })
          .eq("id", draft.id);
        if (e2) throw e2;
      }

      toast.success("Proposta atualizada com sucesso");
      setEditMode(false);
      setDraftProposta(null);
      setDraftOperadoras([]);
      await loadProposta();
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Fonte de dados a exibir: draft em modo edição, senão real
  const view = editMode && draftProposta ? draftProposta : proposta;
  const viewOps = editMode ? draftOperadoras : operadoras;

  const whatsappLink = (message: string) => {
    if (!proposta?.consultora_telefone) return "#";
    const phone = formatPhone(proposta.consultora_telefone);
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const generalWhatsapp = () =>
    whatsappLink("Olá! Vi minha proposta e gostaria de falar sobre as opções apresentadas.");

  // Calcula o total mensal de uma operadora (usa valor_mensal ou faixas etárias)
  const getTotalMensal = (op: Operadora): number | null => {
    const faixasRaw = (op as any).faixas_etarias as string | null;
    const idadesRaw = (view as any)?.idades_beneficiarios as string | null;
    if (faixasRaw && idadesRaw) {
      const faixas = parseFaixasEtarias(faixasRaw);
      const idades = parseIdades(idadesRaw);
      if (faixas.length > 0 && idades.length > 0) {
        return calcularTotalPorFaixas(idades, faixas).total;
      }
    }
    return op.valor_mensal ?? null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-lg">Carregando sua proposta...</div>
      </div>
    );
  }

  if (notFound || !proposta || !view) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <Shield className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Proposta não encontrada</h1>
        <p className="text-muted-foreground">O link pode estar incorreto ou a proposta não está mais disponível.</p>
      </div>
    );
  }

  // Pré-calcula totais e a maior mensalidade (para a linha de economia)
  const totais = viewOps.map((op) => getTotalMensal(op));
  const maiorTotal = Math.max(...totais.filter((t): t is number => t !== null), 0);
  const algumComTotal = totais.some((t) => t !== null);

  // Define as linhas da tabela comparativa
  const criterios: { label: string; field: EditableOperadoraField; type: "text" | "textarea" | "sim_nao" }[] = [
    { label: "Coparticipação", field: "coparticipacao", type: "sim_nao" },
    { label: "Acomodação", field: "acomodacao", type: "text" },
    { label: "Abrangência", field: "abrangencia", type: "text" },
    { label: "Reembolso", field: "reembolso", type: "text" },
    { label: "Cobertura", field: "resumo_cobertura", type: "textarea" },
    { label: "Rede credenciada", field: "rede_credenciada_resumo", type: "textarea" },
  ];

  const renderCellValue = (val: string | null | undefined) => {
    if (!val || !val.trim()) return <span className="text-muted-foreground">—</span>;
    if (val.includes("\n") || val.split(/[,;]/).length > 2) {
      const items = val
        .split(/[\n,;]+/)
        .map((s) => s.replace(/^[-•*\d.)\s]+/, "").trim())
        .filter((s) => s.length > 1)
        .slice(0, 3);
      return (
        <ul className="text-xs space-y-1 text-left">
          {items.map((s, i) => (
            <li key={i}>• {s}</li>
          ))}
        </ul>
      );
    }
    return <span className="whitespace-pre-line">{val}</span>;
  };

  // Renderiza célula editável conforme tipo
  const renderEditableCell = (op: Operadora, crit: typeof criterios[number]) => {
    const value = (op[crit.field] as string | null) ?? "";
    if (crit.type === "sim_nao") {
      return (
        <Select
          value={value || ""}
          onValueChange={(v) => updateDraftOperadora(op.id, crit.field, v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Sim">Sim</SelectItem>
            <SelectItem value="Não">Não</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    if (crit.type === "textarea") {
      return (
        <Textarea
          value={value}
          onChange={(e) => updateDraftOperadora(op.id, crit.field, e.target.value)}
          className="text-xs min-h-[70px]"
        />
      );
    }
    return (
      <Input
        value={value}
        onChange={(e) => updateDraftOperadora(op.id, crit.field, e.target.value)}
        className="h-8 text-xs"
      />
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Barra de edição (apenas dono logado) */}
      {canEdit && (
        <div className="sticky top-0 z-40 bg-amber-50 border-b border-amber-200">
          <div className="container py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-amber-900">
              <Pencil className="w-3.5 h-3.5" />
              <span className="font-medium">Modo administrador</span>
              {editMode && <span className="opacity-75">— editando inline</span>}
            </div>
            <div className="flex items-center gap-2">
              {!editMode ? (
                <>
                  <Link to={`/admin/proposta/${proposta.id}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Editor completo
                    </Button>
                  </Link>
                  <Button size="sm" onClick={handleEnterEdit}>
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Editar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={saving}>
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <header className="gradient-hero text-primary-foreground">
        <div className="container py-8 md:py-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-white/10 backdrop-blur flex items-center justify-center mb-2">
            <Shield className="w-7 h-7" />
          </div>
          <p className="text-xs uppercase tracking-widest opacity-80">Estudo Personalizado</p>
          <h1 className="text-2xl md:text-4xl font-bold">Comparativo de Planos — Todas as Opções</h1>
          {editMode ? (
            <div className="max-w-md mx-auto">
              <Input
                value={view.nome_cliente ?? ""}
                onChange={(e) => updateDraftProposta("nome_cliente", e.target.value)}
                className="text-center text-foreground"
                placeholder="Nome do cliente"
              />
            </div>
          ) : (
            <p className="text-base md:text-lg opacity-90 max-w-xl mx-auto">
              Olá, <span className="font-semibold">{view.nome_cliente}</span>! Confira lado a lado as melhores opções
              para o seu perfil.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm opacity-80 pt-2">
            {editMode ? (
              <>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <Input
                    value={view.cidade ?? ""}
                    onChange={(e) => updateDraftProposta("cidade", e.target.value)}
                    placeholder="Cidade"
                    className="h-7 text-xs w-32 text-foreground"
                  />
                  <Input
                    value={view.estado ?? ""}
                    onChange={(e) => updateDraftProposta("estado", e.target.value)}
                    placeholder="UF"
                    maxLength={2}
                    className="h-7 text-xs w-14 text-foreground"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <Input
                    type="date"
                    value={view.validade_proposta ?? ""}
                    onChange={(e) => updateDraftProposta("validade_proposta", e.target.value)}
                    className="h-7 text-xs text-foreground"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  <Input
                    value={view.tipo_produto ?? ""}
                    onChange={(e) => updateDraftProposta("tipo_produto", e.target.value)}
                    placeholder="Tipo de produto"
                    className="h-7 text-xs w-40 text-foreground"
                  />
                </div>
              </>
            ) : (
              <>
                {view.cidade && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {view.cidade}
                    {view.estado ? ` - ${view.estado}` : ""}
                  </span>
                )}
                {view.validade_proposta && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Válida até {format(new Date(view.validade_proposta), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                )}
                {view.tipo_produto && (
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {view.tipo_produto}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* ====== TABELA COMPARATIVA (desktop/tablet) ====== */}
      <section className="container py-8 md:py-10 hidden md:block">
        <div className="rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="text-left px-4 py-4 font-semibold w-56 align-top border-r border-primary-foreground/10">
                    Planos
                  </th>
                  {viewOps.map((op) => (
                    <th
                      key={op.id}
                      className="text-left px-4 py-4 font-semibold align-top border-r border-primary-foreground/10 last:border-r-0 min-w-[180px]"
                    >
                      <div className="space-y-1">
                        {editMode ? (
                          <>
                            <Input
                              value={op.operadora_nome ?? ""}
                              onChange={(e) => updateDraftOperadora(op.id, "operadora_nome", e.target.value)}
                              className="h-8 text-sm text-foreground"
                              placeholder="Operadora"
                            />
                            <Input
                              value={op.plano_nome ?? ""}
                              onChange={(e) => updateDraftOperadora(op.id, "plano_nome", e.target.value)}
                              className="h-7 text-xs text-foreground"
                              placeholder="Plano"
                            />
                            <Select
                              value={op.destaque_comercial ?? "none"}
                              onValueChange={(v) =>
                                updateDraftOperadora(op.id, "destaque_comercial", v === "none" ? null : v)
                              }
                            >
                              <SelectTrigger className="h-7 text-xs text-foreground">
                                <SelectValue placeholder="Sem destaque" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem destaque</SelectItem>
                                {Object.entries(DESTAQUE_LABELS).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </>
                        ) : (
                          <>
                            <div className="text-base leading-tight">{op.operadora_nome}</div>
                            {op.plano_nome && (
                              <div className="text-xs font-normal opacity-90">{op.plano_nome}</div>
                            )}
                            {op.destaque_comercial && DESTAQUE_LABELS[op.destaque_comercial] && (
                              <Badge
                                className={`mt-2 text-[10px] px-2 py-0.5 ${DESTAQUE_COLORS[op.destaque_comercial]}`}
                              >
                                {DESTAQUE_LABELS[op.destaque_comercial]}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {criterios.map((crit, rowIdx) => (
                  <tr
                    key={crit.label}
                    className={rowIdx % 2 === 0 ? "bg-background" : "bg-muted/40"}
                  >
                    <td className="px-4 py-3 font-medium text-foreground border-r border-border align-top">
                      {crit.label}
                    </td>
                    {viewOps.map((op) => (
                      <td
                        key={op.id}
                        className="px-4 py-3 text-foreground border-r border-border last:border-r-0 align-top"
                      >
                        {editMode
                          ? renderEditableCell(op, crit)
                          : renderCellValue(op[crit.field] as string | null)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* Mensalidade Total — linha de destaque */}
                {(algumComTotal || editMode) && (
                  <tr className="bg-primary text-primary-foreground">
                    <td className="px-4 py-4 font-bold uppercase tracking-wide text-sm border-r border-primary-foreground/10">
                      Mensalidade Total
                    </td>
                    {viewOps.map((op, i) => (
                      <td
                        key={op.id}
                        className="px-4 py-4 font-bold text-lg border-r border-primary-foreground/10 last:border-r-0"
                      >
                        {editMode ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={op.valor_mensal ?? ""}
                            onChange={(e) =>
                              updateDraftOperadora(
                                op.id,
                                "valor_mensal",
                                e.target.value === "" ? null : parseFloat(e.target.value)
                              )
                            }
                            className="h-9 text-base text-foreground"
                            placeholder="0,00"
                          />
                        ) : totais[i] !== null ? (
                          formatCurrency(totais[i])
                        ) : (
                          "—"
                        )}
                      </td>
                    ))}
                  </tr>
                )}
                {/* Economia */}
                {!editMode && algumComTotal && viewOps.length > 1 && (
                  <tr className="bg-accent/20">
                    <td className="px-4 py-3 font-medium text-foreground border-r border-border">
                      Economia vs. mais caro
                    </td>
                    {viewOps.map((op, i) => {
                      const t = totais[i];
                      const economia = t !== null ? maiorTotal - t : 0;
                      return (
                        <td
                          key={op.id}
                          className="px-4 py-3 font-semibold text-foreground border-r border-border last:border-r-0"
                        >
                          {economia > 0 ? formatCurrency(economia) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                )}
                {/* PDFs */}
                {!editMode && viewOps.some((op) => op.pdf_url) && (
                  <tr className="bg-muted/30">
                    <td className="px-4 py-3 text-xs text-muted-foreground border-r border-border">
                      Material da operadora
                    </td>
                    {viewOps.map((op) => (
                      <td
                        key={op.id}
                        className="px-4 py-3 text-xs border-r border-border last:border-r-0"
                      >
                        {op.pdf_url ? (
                          <a
                            href={op.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Ver PDF
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* ====== CARDS EMPILHADOS (mobile) ====== */}
      <section className="container py-6 md:hidden space-y-4">
        {viewOps.map((op, i) => {
          const total = totais[i];
          return (
            <Card key={op.id} className="overflow-hidden">
              <div className="bg-primary text-primary-foreground p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {editMode ? (
                      <div className="space-y-1">
                        <Input
                          value={op.operadora_nome ?? ""}
                          onChange={(e) => updateDraftOperadora(op.id, "operadora_nome", e.target.value)}
                          className="h-8 text-sm text-foreground"
                        />
                        <Input
                          value={op.plano_nome ?? ""}
                          onChange={(e) => updateDraftOperadora(op.id, "plano_nome", e.target.value)}
                          className="h-7 text-xs text-foreground"
                          placeholder="Plano"
                        />
                      </div>
                    ) : (
                      <>
                        <h3 className="font-bold">{op.operadora_nome}</h3>
                        {op.plano_nome && <p className="text-xs opacity-90">{op.plano_nome}</p>}
                      </>
                    )}
                  </div>
                  {!editMode && op.destaque_comercial && DESTAQUE_LABELS[op.destaque_comercial] && (
                    <Badge className={`text-[10px] ${DESTAQUE_COLORS[op.destaque_comercial]}`}>
                      {DESTAQUE_LABELS[op.destaque_comercial]}
                    </Badge>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-primary-foreground/20">
                  <p className="text-xs opacity-80 uppercase tracking-wide">Mensalidade Total</p>
                  {editMode ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={op.valor_mensal ?? ""}
                      onChange={(e) =>
                        updateDraftOperadora(
                          op.id,
                          "valor_mensal",
                          e.target.value === "" ? null : parseFloat(e.target.value)
                        )
                      }
                      className="h-9 text-base mt-1 text-foreground"
                    />
                  ) : (
                    total !== null && <p className="text-2xl font-bold">{formatCurrency(total)}</p>
                  )}
                </div>
              </div>
              <div className="p-4 space-y-3 text-sm">
                {criterios.map((crit) => {
                  const v = op[crit.field] as string | null;
                  if (!editMode && !v) return null;
                  return (
                    <div key={crit.label} className="flex flex-col gap-1 pb-2 border-b last:border-b-0">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {crit.label}
                      </span>
                      <div className="text-foreground">
                        {editMode ? renderEditableCell(op, crit) : renderCellValue(v)}
                      </div>
                    </div>
                  );
                })}
                {!editMode && op.pdf_url && (
                  <a href={op.pdf_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      <FileText className="w-4 h-4 mr-2" />
                      Ver PDF da Operadora
                    </Button>
                  </a>
                )}
              </div>
            </Card>
          );
        })}
      </section>

      {/* Seção de faixas etárias removida a pedido do usuário */}

      {/* Observações */}
      {!editMode && proposta.observacoes_gerais && (
        <section className="container pb-8">
          <Card className="p-6 bg-muted/50">
            <p className="text-sm text-muted-foreground font-medium mb-1">Observações</p>
            <p className="text-foreground whitespace-pre-line">{proposta.observacoes_gerais}</p>
          </Card>
        </section>
      )}

      {/* Consultora */}
      {!editMode && proposta.consultora_nome && (
        <section className="container pb-12">
          <Card className="p-6 md:p-8 text-center max-w-lg mx-auto">
            {proposta.consultora_foto_url && (
              <img
                src={proposta.consultora_foto_url}
                alt={proposta.consultora_nome}
                className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-4 border-accent/20"
              />
            )}
            <h3 className="text-lg font-bold text-foreground">{proposta.consultora_nome}</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Sua consultora está disponível para esclarecer dúvidas e ajudar na melhor escolha.
            </p>
            <a href={generalWhatsapp()} target="_blank" rel="noopener noreferrer">
              <Button variant="whatsapp" size="lg">
                <MessageCircle className="w-5 h-5 mr-2" />
                Falar com {proposta.consultora_nome} no WhatsApp
              </Button>
            </a>
          </Card>
        </section>
      )}

      {/* Botão fixo WhatsApp */}
      {!editMode && proposta.consultora_telefone && (
        <a href={generalWhatsapp()} target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-50">
          <Button variant="whatsapp" size="lg" className="rounded-full shadow-xl h-14 px-6 text-base">
            <MessageCircle className="w-5 h-5 mr-2" />
            Falar no WhatsApp
          </Button>
        </a>
      )}

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>Proposta preparada com ❤️ pela sua corretora de confiança</p>
      </footer>
    </div>
  );
}
