import { useState, useEffect, useMemo, Fragment } from "react";
import { useLocation, useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Proposta,
  Operadora,
  formatCurrency,
  formatPhone,
  DESTAQUE_LABELS,
  DESTAQUE_COLORS,
  COLUNA_COLORS,
  getColunaColor,
  getCellColorClass,
  getCellColorKey,
  agruparPorOperadora,
  consolidarGruposSoma,
  somarValoresMensais,
  parseFaixasEtarias,
  parseIdades,
  calcularTotalPorFaixas,
} from "@/lib/proposal-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, MessageCircle, FileText, MapPin, Calendar, Heart, Pencil, Save, X, ExternalLink, Palette, Scale, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  | "destaque_comercial"
  | "cor_coluna"
  | "cores_celulas"
  | "grupo_soma";

export default function PublicPropostaPage() {
  const { slug } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Modo edição (apenas dono logado)
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftProposta, setDraftProposta] = useState<Proposta | null>(null);
  const [draftOperadoras, setDraftOperadoras] = useState<Operadora[]>([]);

  // Modo comparação (cliente)
  const [selectedPlans, setSelectedPlans] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);

  const isPortalPreview = location.pathname.startsWith("/admin/cotacao/") || searchParams.get("portal") === "1";

  const canEdit = useMemo(
    () => isPortalPreview && !authLoading && !!user && !!proposta,
    [isPortalPreview, authLoading, user, proposta]
  );

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

  const updateCellColor = (id: string, field: string, colorKey: string | null) => {
    setDraftOperadoras((ops) =>
      ops.map((o) => {
        if (o.id !== id) return o;
        const current = ((o as any).cores_celulas ?? {}) as Record<string, string>;
        const next = { ...current };
        if (colorKey === null) delete next[field];
        else next[field] = colorKey;
        return { ...o, cores_celulas: Object.keys(next).length > 0 ? next : null } as any;
      })
    );
  };

  const handleSave = async () => {
    if (!draftProposta || !proposta) return;
    setSaving(true);
    try {
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

      for (const draft of draftOperadoras) {
        const original = operadoras.find((o) => o.id === draft.id);
        if (!original) continue;
        const fieldsToCheck: EditableOperadoraField[] = [
          "operadora_nome","plano_nome","valor_mensal","coparticipacao","acomodacao",
          "abrangencia","reembolso","resumo_cobertura","rede_credenciada_resumo",
          "destaque_comercial","cor_coluna","cores_celulas","grupo_soma",
        ];
        const changed = fieldsToCheck.some((f) => {
          const a = (original as any)[f];
          const b = (draft as any)[f];
          if (f === "cores_celulas") return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
          return a !== b;
        });
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
            cor_coluna: (draft as any).cor_coluna,
            cores_celulas: (draft as any).cores_celulas ?? null,
            grupo_soma: ((draft as any).grupo_soma || "").trim() || null,
          } as any)
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

  const view = editMode && draftProposta ? draftProposta : proposta;
  const viewOpsRaw = editMode ? draftOperadoras : operadoras;

  // Para o cliente (não-admin), consolida planos com o mesmo `grupo_soma` num único plano virtual
  // que mostra a soma das mensalidades. No modo admin, mostramos sempre todos individualmente.
  const viewOps = useMemo<Operadora[]>(() => {
    if (editMode) return viewOpsRaw;
    const consolidados = consolidarGruposSoma(viewOpsRaw as any);
    return consolidados.map((entry) => {
      if (!entry.isGrupo) return entry.representante as Operadora;
      const rep = entry.representante as Operadora;
      const total = somarValoresMensais(entry.membros as any);
      const nomes = entry.membros
        .map((m: any) => (m.plano_nome ? String(m.plano_nome).trim() : ""))
        .filter(Boolean)
        .join(" + ");
      return {
        ...rep,
        id: `grupo-${entry.grupoLabel}-${rep.id}`,
        valor_mensal: total,
        plano_nome: nomes || rep.plano_nome,
      } as Operadora;
    });
  }, [editMode, viewOpsRaw]);

  const whatsappLink = (message: string) => {
    if (!proposta?.consultora_telefone) return "#";
    const phone = formatPhone(proposta.consultora_telefone);
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const generalWhatsapp = () =>
    whatsappLink("Olá! Vi minha proposta e gostaria de falar sobre as opções apresentadas.");

  const getTotalMensal = (op: Operadora): number | null => {
    if (op.valor_mensal !== null && op.valor_mensal !== undefined) return op.valor_mensal;
    const faixasRaw = (op as any).faixas_etarias as string | null;
    const idadesRaw = (view as any)?.idades_beneficiarios as string | null;
    const faixas = faixasRaw ? parseFaixasEtarias(faixasRaw) : [];
    if (faixas.length > 0 && idadesRaw) {
      const idades = parseIdades(idadesRaw);
      if (idades.length > 0) return calcularTotalPorFaixas(idades, faixas).total;
    }
    if (faixas.length > 0) {
      const menor = Math.min(...faixas.map((f) => f.valor));
      if (menor > 0) return menor;
    }
    return null;
  };

  // Toggle seleção de plano para comparação
  const toggleSelected = (id: string) => {
    setSelectedPlans((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  // Agrupamento por operadora
  const grupos = agruparPorOperadora(viewOps);

  // Totais por id (para uso fácil no comparador)
  const totalById = new Map<string, number | null>();
  viewOps.forEach((op) => totalById.set(op.id, getTotalMensal(op)));
  const todosTotais = Array.from(totalById.values()).filter((t): t is number => t !== null);
  const maiorTotal = todosTotais.length > 0 ? Math.max(...todosTotais) : 0;
  const algumComTotal = todosTotais.length > 0;

  const criterios: {
    label: string;
    field: EditableOperadoraField;
    type: "text" | "textarea" | "sim_nao" | "acomodacao" | "reembolso";
  }[] = [
    { label: "Coparticipação", field: "coparticipacao", type: "sim_nao" },
    { label: "Acomodação", field: "acomodacao", type: "acomodacao" },
    { label: "Abrangência", field: "abrangencia", type: "text" },
    { label: "Reembolso", field: "reembolso", type: "reembolso" },
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
          {items.map((s, i) => <li key={i}>• {s}</li>)}
        </ul>
      );
    }
    return <span className="whitespace-pre-line">{val}</span>;
  };

  const renderEditableCell = (op: Operadora, crit: typeof criterios[number]) => {
    const value = (op[crit.field as keyof Operadora] as string | null) ?? "";
    if (crit.type === "sim_nao") {
      return (
        <Select value={value || ""} onValueChange={(v) => updateDraftOperadora(op.id, crit.field, v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Sim">Sim</SelectItem>
            <SelectItem value="Não">Não</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    if (crit.type === "acomodacao") {
      return (
        <Select value={value || ""} onValueChange={(v) => updateDraftOperadora(op.id, crit.field, v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Enfermaria">Enfermaria</SelectItem>
            <SelectItem value="Apartamento">Apartamento</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    if (crit.type === "reembolso") {
      return (
        <Select value={value || ""} onValueChange={(v) => updateDraftOperadora(op.id, crit.field, v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Sim">Sim</SelectItem>
            <SelectItem value="Não">Não</SelectItem>
            <SelectItem value="Parcial">Parcial</SelectItem>
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

  // Renderiza paleta de cores reutilizável.
  const renderPalette = (currentKey: string | null, onPick: (key: string | null) => void) => (
    <div className="grid grid-cols-5 gap-1.5">
      <button
        type="button"
        onClick={() => onPick(null)}
        className={cn(
          "h-8 rounded border text-[10px] flex items-center justify-center bg-background hover:bg-muted",
          !currentKey && "ring-2 ring-primary"
        )}
        title="Sem cor"
      >
        —
      </button>
      {Object.entries(COLUNA_COLORS).map(([key, c]) => (
        <button
          key={key}
          type="button"
          onClick={() => onPick(key)}
          className={cn(
            "h-8 rounded flex items-center justify-center",
            c.header,
            currentKey === key && "ring-2 ring-offset-1 ring-foreground"
          )}
          title={c.label}
        >
          {currentKey === key && <Check className="w-3 h-3" />}
        </button>
      ))}
    </div>
  );

  // Seletor de cor da coluna inteira (modo edição)
  const ColorPicker = ({ op }: { op: Operadora }) => {
    const current = (op as any).cor_coluna as string | null;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-foreground">
            <Palette className="w-3 h-3" />
            Coluna
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <p className="text-xs font-medium mb-2">Cor da coluna inteira</p>
          {renderPalette(current, (k) => updateDraftOperadora(op.id, "cor_coluna", k as any))}
        </PopoverContent>
      </Popover>
    );
  };

  // Seletor de cor de uma célula individual
  const CellColorPicker = ({ op, field }: { op: Operadora; field: string }) => {
    const current = getCellColorKey((op as any).cores_celulas, field);
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "h-6 w-6 rounded border flex items-center justify-center hover:bg-muted shrink-0",
              current && COLUNA_COLORS[current]?.header
            )}
            title="Cor da célula"
          >
            <Palette className={cn("w-3 h-3", current ? "text-white" : "text-muted-foreground")} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <p className="text-xs font-medium mb-2">Cor desta célula</p>
          {renderPalette(current, (k) => updateCellColor(op.id, field, k))}
        </PopoverContent>
      </Popover>
    );
  };

  // Resolve as classes de cor para um plano (cai pro primary se não tiver cor)
  const headerClassFor = (op: Operadora) => {
    const c = getColunaColor((op as any).cor_coluna);
    return c ? c.header : "bg-primary text-primary-foreground";
  };
  const borderClassFor = (op: Operadora) => {
    const c = getColunaColor((op as any).cor_coluna);
    return c ? c.border : "border-primary";
  };

  // ====== Renderização da tabela comparativa ======
  // Por padrão é usada para uma única operadora (uma tabela por operadora).
  // Quando `showOperadoraInHeader` é true, exibe o nome da operadora junto ao plano (usado no modal de comparação misturando operadoras).
  const renderComparativeTable = (ops: Operadora[], opts: { showOperadoraInHeader?: boolean } = {}) => {
    const { showOperadoraInHeader = false } = opts;
    const totais = ops.map((op) => totalById.get(op.id) ?? null);
    const maior = Math.max(...totais.filter((t): t is number => t !== null), 0);
    const algum = totais.some((t) => t !== null);

    return (
      <div className="rounded-lg border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 font-semibold w-56 align-top border-r border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  Planos
                </th>
                {ops.map((op) => (
                  <th
                    key={op.id}
                    className={cn(
                      "text-left px-4 py-3 font-semibold align-top border-r border-white/10 last:border-r-0 min-w-[180px]",
                      headerClassFor(op)
                    )}
                  >
                    <div className="space-y-1">
                      {!editMode && (
                        <label className="flex items-center gap-1.5 text-[10px] font-normal opacity-90 cursor-pointer mb-1">
                          <Checkbox
                            checked={selectedPlans.has(op.id)}
                            onCheckedChange={() => toggleSelected(op.id)}
                            className="h-3.5 w-3.5 border-white/60 data-[state=checked]:bg-white data-[state=checked]:text-primary"
                          />
                          Comparar
                        </label>
                      )}
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
                          <Input
                            value={(op as any).grupo_soma ?? ""}
                            onChange={(e) => updateDraftOperadora(op.id, "grupo_soma" as any, e.target.value)}
                            className="h-6 text-[10px] text-foreground bg-amber-50 border-amber-300"
                            placeholder='Grupo soma (ex: "Sócios+Func")'
                            title="Planos com o mesmo rótulo serão somados em um único card para o cliente. O cliente NÃO vê esse rótulo."
                          />
                          <div className="flex items-center gap-1 flex-wrap">
                            <Select
                              value={op.destaque_comercial ?? "none"}
                              onValueChange={(v) =>
                                updateDraftOperadora(op.id, "destaque_comercial", v === "none" ? null : v)
                              }
                            >
                              <SelectTrigger className="h-7 text-xs text-foreground w-32">
                                <SelectValue placeholder="Sem destaque" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem destaque</SelectItem>
                                {Object.entries(DESTAQUE_LABELS).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <ColorPicker op={op} />
                          </div>
                        </>
                      ) : (
                        <>
                          {showOperadoraInHeader && op.operadora_nome && (
                            <div className="text-[10px] uppercase tracking-wide opacity-80">{op.operadora_nome}</div>
                          )}
                          {op.plano_nome && (
                            <div className="text-base leading-tight font-bold">{op.plano_nome}</div>
                          )}
                          {op.destaque_comercial && DESTAQUE_LABELS[op.destaque_comercial] && (
                            <Badge className={`mt-2 text-[10px] px-2 py-0.5 ${DESTAQUE_COLORS[op.destaque_comercial]}`}>
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
                <tr key={crit.label} className={rowIdx % 2 === 0 ? "bg-background" : "bg-muted/40"}>
                  <td className="px-4 py-3 font-medium text-foreground border-r border-border align-top">
                    {crit.label}
                  </td>
                  {ops.map((op) => {
                    const cellColor = getCellColorClass((op as any).cores_celulas, crit.field);
                    return (
                      <td
                        key={op.id}
                        className={cn(
                          "px-4 py-3 text-foreground border-r border-border last:border-r-0 align-top",
                          cellColor
                        )}
                      >
                        {editMode ? (
                          <div className="flex items-start gap-1.5">
                            <div className="flex-1 min-w-0">{renderEditableCell(op, crit)}</div>
                            <CellColorPicker op={op} field={crit.field} />
                          </div>
                        ) : (
                          renderCellValue(op[crit.field as keyof Operadora] as string | null)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-primary text-primary-foreground">
                <td className="px-4 py-4 font-bold uppercase tracking-wide text-sm border-r border-primary-foreground/10">
                  Mensalidade Total
                </td>
                {ops.map((op, i) => (
                  <td key={op.id} className="px-4 py-4 font-bold text-lg border-r border-primary-foreground/10 last:border-r-0">
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
                    ) : totais[i] !== null ? formatCurrency(totais[i]) : "—"}
                  </td>
                ))}
              </tr>
              {!editMode && algum && ops.length > 1 && (
                <tr className="bg-accent/20">
                  <td className="px-4 py-3 font-medium text-foreground border-r border-border">Economia vs. mais caro</td>
                  {ops.map((op, i) => {
                    const t = totais[i];
                    const economia = t !== null ? maior - t : 0;
                    return (
                      <td key={op.id} className="px-4 py-3 font-semibold text-foreground border-r border-border last:border-r-0">
                        {economia > 0 ? formatCurrency(economia) : "—"}
                      </td>
                    );
                  })}
                </tr>
              )}
              {!editMode && ops.some((op) => op.pdf_url) && (
                <tr className="bg-muted/30">
                  <td className="px-4 py-3 text-xs text-muted-foreground border-r border-border">Material da operadora</td>
                  {ops.map((op) => (
                    <td key={op.id} className="px-4 py-3 text-xs border-r border-border last:border-r-0">
                      {op.pdf_url ? (
                        <a href={op.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          <FileText className="w-3.5 h-3.5" /> Ver PDF
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  // Mensagem de WhatsApp para comparação
  const compareWhatsapp = () => {
    const sel = viewOps.filter((op) => selectedPlans.has(op.id));
    const lista = sel.map((op) => `• ${op.operadora_nome}${op.plano_nome ? " — " + op.plano_nome : ""}`).join("\n");
    return whatsappLink(`Olá! Gostaria de tirar dúvidas sobre estes planos:\n${lista}`);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
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
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={saving}>
                    <X className="w-3.5 h-3.5 mr-1.5" /> Cancelar
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
              Olá, <span className="font-semibold">{view.nome_cliente}</span>! Confira lado a lado as melhores opções para o seu perfil.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm opacity-80 pt-2">
            {editMode ? (
              <>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <Input value={view.cidade ?? ""} onChange={(e) => updateDraftProposta("cidade", e.target.value)} placeholder="Cidade" className="h-7 text-xs w-32 text-foreground" />
                  <Input value={view.estado ?? ""} onChange={(e) => updateDraftProposta("estado", e.target.value)} placeholder="UF" maxLength={2} className="h-7 text-xs w-14 text-foreground" />
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <Input type="date" value={view.validade_proposta ?? ""} onChange={(e) => updateDraftProposta("validade_proposta", e.target.value)} className="h-7 text-xs text-foreground" />
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  <Input value={view.tipo_produto ?? ""} onChange={(e) => updateDraftProposta("tipo_produto", e.target.value)} placeholder="Tipo de produto" className="h-7 text-xs w-40 text-foreground" />
                </div>
              </>
            ) : (
              <>
                {view.cidade && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {view.cidade}{view.estado ? ` - ${view.estado}` : ""}
                  </span>
                )}
                {view.validade_proposta && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> Válida até {format(new Date(view.validade_proposta), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                )}
                {view.tipo_produto && (
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4" /> {view.tipo_produto}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Tabela comparativa (desktop) — uma tabela por operadora */}
      <section className="container py-8 md:py-10 hidden md:block space-y-8">
        {grupos.map((g) => (
          <div key={g.nome} className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{g.nome}</h2>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {g.planos.length} {g.planos.length === 1 ? "plano" : "planos"}
              </span>
            </div>
            {renderComparativeTable(g.planos)}
          </div>
        ))}
      </section>

      {/* Cards mobile — agrupados por operadora */}
      <section className="container py-6 md:hidden space-y-6">
        {grupos.map((g) => (
          <div key={g.nome} className="space-y-3">
            <h2 className="text-sm uppercase tracking-wider font-semibold text-muted-foreground border-b pb-1">
              {g.nome}
            </h2>
            {g.planos.map((op) => {
              const total = totalById.get(op.id) ?? null;
              const headerCls = headerClassFor(op);
              const borderCls = borderClassFor(op);
              return (
                <Card key={op.id} className={cn("overflow-hidden border-t-4", borderCls)}>
                  <div className={cn("p-4", headerCls)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {editMode ? (
                          <div className="space-y-1">
                            <Input value={op.operadora_nome ?? ""} onChange={(e) => updateDraftOperadora(op.id, "operadora_nome", e.target.value)} className="h-8 text-sm text-foreground" />
                            <Input value={op.plano_nome ?? ""} onChange={(e) => updateDraftOperadora(op.id, "plano_nome", e.target.value)} className="h-7 text-xs text-foreground" placeholder="Plano" />
                            <Input
                              value={(op as any).grupo_soma ?? ""}
                              onChange={(e) => updateDraftOperadora(op.id, "grupo_soma" as any, e.target.value)}
                              className="h-6 text-[10px] text-foreground bg-amber-50 border-amber-300"
                              placeholder='Grupo soma (admin)'
                            />
                            <ColorPicker op={op} />
                          </div>
                        ) : (
                          <>
                            {op.plano_nome && <h3 className="font-bold text-lg leading-tight">{op.plano_nome}</h3>}
                          </>
                        )}
                      </div>
                      {!editMode && (
                        <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                          <Checkbox
                            checked={selectedPlans.has(op.id)}
                            onCheckedChange={() => toggleSelected(op.id)}
                            className="h-4 w-4 border-white/60 data-[state=checked]:bg-white data-[state=checked]:text-primary"
                          />
                          Comparar
                        </label>
                      )}
                    </div>
                    {!editMode && op.destaque_comercial && DESTAQUE_LABELS[op.destaque_comercial] && (
                      <Badge className={`mt-2 text-[10px] ${DESTAQUE_COLORS[op.destaque_comercial]}`}>
                        {DESTAQUE_LABELS[op.destaque_comercial]}
                      </Badge>
                    )}
                    <div className="mt-3 pt-3 border-t border-white/20">
                      <p className="text-xs opacity-80 uppercase tracking-wide">Mensalidade Total</p>
                      {editMode ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={op.valor_mensal ?? ""}
                          onChange={(e) =>
                            updateDraftOperadora(op.id, "valor_mensal", e.target.value === "" ? null : parseFloat(e.target.value))
                          }
                          className="h-9 text-base mt-1 text-foreground"
                        />
                      ) : (
                        <p className="text-2xl font-bold">{total !== null ? formatCurrency(total) : "—"}</p>
                      )}
                    </div>
                  </div>
                  <div className="p-4 space-y-3 text-sm">
                    {criterios.map((crit) => {
                      const v = op[crit.field as keyof Operadora] as string | null;
                      if (!editMode && !v) return null;
                      const cellColor = getCellColorClass((op as any).cores_celulas, crit.field);
                      return (
                        <div
                          key={crit.label}
                          className={cn(
                            "flex flex-col gap-1 pb-2 border-b last:border-b-0 -mx-2 px-2 rounded",
                            cellColor
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{crit.label}</span>
                            {editMode && <CellColorPicker op={op} field={crit.field} />}
                          </div>
                          <div className="text-foreground">
                            {editMode ? renderEditableCell(op, crit) : renderCellValue(v)}
                          </div>
                        </div>
                      );
                    })}
                    {!editMode && op.pdf_url && (
                      <a href={op.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="w-full mt-2">
                          <FileText className="w-4 h-4 mr-2" /> Ver PDF da Operadora
                        </Button>
                      </a>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ))}
      </section>

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
              <img src={proposta.consultora_foto_url} alt={proposta.consultora_nome} className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-4 border-accent/20" />
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

      {/* Barra de comparação flutuante (cliente) */}
      {!editMode && selectedPlans.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t shadow-2xl">
          <div className="container py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Scale className="w-4 h-4 text-primary" />
              <span className="font-medium text-foreground">
                {selectedPlans.size} plano{selectedPlans.size > 1 ? "s" : ""} selecionado{selectedPlans.size > 1 ? "s" : ""}
              </span>
              {selectedPlans.size > 4 && (
                <span className="text-xs text-muted-foreground hidden sm:inline">(muitos planos podem dificultar a leitura em telas pequenas)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedPlans(new Set())}>Limpar</Button>
              <Button size="sm" disabled={selectedPlans.size < 2} onClick={() => setCompareOpen(true)}>
                <Scale className="w-4 h-4 mr-1.5" />
                Comparar agora
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de comparação */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Comparação de planos selecionados
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {renderComparativeTable(viewOps.filter((op) => selectedPlans.has(op.id)), { showOperadoraInHeader: true })}
            {proposta.consultora_telefone && (
              <div className="flex justify-center pt-2">
                <a href={compareWhatsapp()} target="_blank" rel="noopener noreferrer">
                  <Button variant="whatsapp" size="lg">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Falar com a consultora sobre estes planos
                  </Button>
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Botão fixo WhatsApp (some quando barra de comparação está ativa) */}
      {!editMode && selectedPlans.size === 0 && proposta.consultora_telefone && (
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
