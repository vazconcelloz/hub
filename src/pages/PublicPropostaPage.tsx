import { useState, useEffect, useMemo, Fragment } from "react";
import { useLocation, useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
import { Shield, MessageCircle, FileText, MapPin, Calendar, Heart, Pencil, Save, X, ExternalLink, Palette, Scale, Check, Plus, Eye, EyeOff, ChevronDown } from "lucide-react";
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
  | "faixas_etarias"
  | "destaque_comercial"
  | "cor_coluna"
  | "cores_celulas"
  | "coparticipacao_detalhes"
  | "grupo_soma";

interface CoparticipacaoItem {
  item: string;
  valor: string;
}

const COPARTICIPACAO_ITENS_PADRAO: CoparticipacaoItem[] = [
  { item: "Consulta", valor: "" },
  { item: "Exames simples", valor: "" },
  { item: "Exames complexos", valor: "" },
  { item: "Terapias", valor: "" },
  { item: "Pronto-socorro", valor: "" },
  { item: "Internação", valor: "" },
];

function parseCoparticipacaoDetalhes(val: any): CoparticipacaoItem[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .filter((x) => x && typeof x === "object" && typeof x.item === "string")
      .map((x) => ({ item: String(x.item), valor: String(x.valor ?? "") }));
  }
  return [];
}

function CoparticipacaoEditor({
  op,
  onChange,
}: {
  op: Operadora;
  onChange: (id: string, field: EditableOperadoraField, value: any) => void;
}) {
  const valor = ((op as any).coparticipacao ?? "").trim();
  const eSimOuParcial = /^(sim|parcial)$/i.test(valor);
  if (!eSimOuParcial) return null;

  const atual = parseCoparticipacaoDetalhes((op as any).coparticipacao_detalhes);
  const lista = atual.length > 0 ? atual : COPARTICIPACAO_ITENS_PADRAO;

  const update = (next: CoparticipacaoItem[]) => {
    const limpos = next.filter((d) => d.item.trim() || d.valor.trim());
    onChange(op.id, "coparticipacao_detalhes", limpos.length > 0 ? limpos : null);
  };

  return (
    <div className="mt-2 rounded-md border border-border/60 bg-background/40 p-2 space-y-1.5">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        Detalhes da coparticipação
      </div>
      {lista.map((d, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            value={d.item}
            onChange={(e) => {
              const next = [...lista];
              next[i] = { ...next[i], item: e.target.value };
              update(next);
            }}
            placeholder="Item"
            className="h-7 text-xs flex-1"
          />
          <Input
            value={d.valor}
            onChange={(e) => {
              const next = [...lista];
              next[i] = { ...next[i], valor: e.target.value };
              update(next);
            }}
            placeholder="ex: 30% ou R$ 25"
            className="h-7 text-xs w-32"
          />
          <button
            type="button"
            onClick={() => {
              const next = lista.filter((_, idx) => idx !== i);
              update(next);
            }}
            className="h-7 w-7 rounded border flex items-center justify-center hover:bg-muted shrink-0"
            title="Remover"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => update([...lista, { item: "", valor: "" }])}
        className="text-xs flex items-center gap-1 text-primary hover:underline"
      >
        <Plus className="w-3 h-3" /> Adicionar linha
      </button>
    </div>
  );
}

export default function PublicPropostaPage() {
  const { slug } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
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
    () => isPortalPreview && !!proposta,
    [isPortalPreview, proposta]
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

  const addDraftOperadora = (operadoraNome?: string) => {
    setDraftOperadoras((ops) => {
      const tempId = `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const maxOrdem = ops.reduce((m, o) => Math.max(m, (o as any).ordem_exibicao ?? 0), 0);
      // Se nenhum nome foi passado, usa o da última operadora existente para a coluna
      // entrar na MESMA tabela (o agrupamento é por operadora_nome).
      const nomeFinal =
        (operadoraNome && operadoraNome.trim()) ||
        (ops.length > 0 ? ops[ops.length - 1].operadora_nome : "Nova Operadora");
      const nova: Operadora = {
        id: tempId,
        proposta_id: proposta?.id ?? "",
        operadora_nome: nomeFinal,
        plano_nome: "Novo Plano",
        valor_mensal: null,
        coparticipacao: null,
        acomodacao: null,
        abrangencia: null,
        reembolso: null,
        resumo_cobertura: null,
        rede_credenciada_resumo: null,
        destaque_comercial: null,
        ordem_exibicao: maxOrdem + 1,
        pdf_url: null,
        faixas_etarias: null,
        previsao_reajuste_faixa: null,
        cor_coluna: null,
        grupo_soma: null,
        cores_celulas: null,
        coparticipacao_detalhes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any;
      return [...ops, nova];
    });
    toast.success("Coluna adicionada", { description: "Edite o nome do plano e demais campos." });
  };

  const removeDraftOperadora = (id: string) => {
    setDraftOperadoras((ops) => ops.filter((o) => o.id !== id));
  };

  const updateDraftProposta = <K extends keyof Proposta>(field: K, value: Proposta[K]) => {
    setDraftProposta((p) => (p ? { ...p, [field]: value } : p));
  };

  const updateDraftOperadora = (id: string, field: EditableOperadoraField, value: any) => {
    setDraftOperadoras((ops) =>
      ops.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  };

  // Aplica a mesma cor de coluna a todos os planos de uma operadora.
  // Permite que cada operadora tenha sua cor independente das demais.
  const updateOperadoraColor = (operadoraNome: string, colorKey: string | null) => {
    setDraftOperadoras((ops) =>
      ops.map((o) =>
        (o.operadora_nome ?? "").trim().toLowerCase() === operadoraNome.trim().toLowerCase()
          ? ({ ...o, cor_coluna: colorKey } as any)
          : o
      )
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

  const toggleLinhaOculta = (field: string) => {
    setDraftProposta((p) => {
      if (!p) return p;
      const atual = ((p as any).linhas_ocultas ?? []) as string[];
      const next = atual.includes(field) ? atual.filter((f) => f !== field) : [...atual, field];
      return { ...p, linhas_ocultas: next } as any;
    });
  };

  const updateRotuloColor = (field: string, colorKey: string | null) => {
    setDraftProposta((p) => {
      if (!p) return p;
      const current = ((p as any).cores_rotulos ?? {}) as Record<string, string>;
      const next = { ...current };
      if (colorKey === null) delete next[field];
      else next[field] = colorKey;
      return { ...p, cores_rotulos: Object.keys(next).length > 0 ? next : null } as any;
    });
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
          linhas_ocultas: (draftProposta as any).linhas_ocultas ?? [],
          cores_rotulos: (draftProposta as any).cores_rotulos ?? null,
        } as any)
        .eq("id", proposta.id);
      if (e1) throw e1;

      // 1) Inserir colunas novas (id começa com "new-")
      const novas = draftOperadoras.filter((d) => String(d.id).startsWith("new-"));
      if (novas.length > 0) {
        const { error: eIns } = await supabase
          .from("proposta_operadoras")
          .insert(novas.map((d) => ({
            proposta_id: proposta.id,
            operadora_nome: d.operadora_nome,
            plano_nome: d.plano_nome,
            valor_mensal: d.valor_mensal,
            coparticipacao: d.coparticipacao,
            acomodacao: d.acomodacao,
            abrangencia: d.abrangencia,
            reembolso: d.reembolso,
            resumo_cobertura: d.resumo_cobertura,
            rede_credenciada_resumo: d.rede_credenciada_resumo,
            destaque_comercial: d.destaque_comercial,
            ordem_exibicao: (d as any).ordem_exibicao ?? 0,
            cor_coluna: (d as any).cor_coluna,
            cores_celulas: (d as any).cores_celulas ?? null,
            coparticipacao_detalhes: (d as any).coparticipacao_detalhes ?? null,
            grupo_soma: ((d as any).grupo_soma || "").trim() || null,
            faixas_etarias: (d as any).faixas_etarias ?? null,
            previsao_reajuste_faixa: (d as any).previsao_reajuste_faixa ?? null,
          })) as any);
        if (eIns) throw eIns;
      }

      // 2) Apagar colunas que estavam no original e foram removidas no draft
      const draftIds = new Set(draftOperadoras.map((d) => d.id));
      const removidas = operadoras.filter((o) => !draftIds.has(o.id));
      if (removidas.length > 0) {
        const { error: eDel } = await supabase
          .from("proposta_operadoras")
          .delete()
          .in("id", removidas.map((o) => o.id));
        if (eDel) throw eDel;
      }

      // 3) Atualizar colunas existentes que mudaram
      for (const draft of draftOperadoras) {
        if (String(draft.id).startsWith("new-")) continue;
        const original = operadoras.find((o) => o.id === draft.id);
        if (!original) continue;
        const fieldsToCheck: EditableOperadoraField[] = [
          "operadora_nome","plano_nome","valor_mensal","coparticipacao","acomodacao",
          "abrangencia","reembolso","resumo_cobertura","rede_credenciada_resumo",
          "destaque_comercial","cor_coluna","cores_celulas","coparticipacao_detalhes","grupo_soma",
        ];
        const changed = fieldsToCheck.some((f) => {
          const a = (original as any)[f];
          const b = (draft as any)[f];
          if (f === "cores_celulas" || f === "coparticipacao_detalhes") return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
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
            coparticipacao_detalhes: (draft as any).coparticipacao_detalhes ?? null,
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
  const viewOps = editMode ? draftOperadoras : operadoras;

  // Mapa: id do plano → info do grupo de soma a que pertence (apenas grupos com 2+ membros).
  // No CLIENTE, a célula "Mensalidade Total" exibe a soma do grupo (mesmo valor para cada coluna do grupo)
  // e um selo discreto indica que aquele plano está somado com outros.
  // Colunas continuam separadas — só a mensalidade muda.
  const grupoSomaInfoById = useMemo(() => {
    const map = new Map<string, { total: number | null; membros: Operadora[]; label: string; cor: string }>();
    if (editMode) return map; // admin sempre vê valores individuais
    const grupos = new Map<string, Operadora[]>();
    for (const op of viewOps) {
      const g = ((op as any).grupo_soma || "").trim();
      if (!g) continue;
      const key = g.toLowerCase();
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key)!.push(op);
    }
    // Paleta de cores para diferenciar visualmente os grupos
    const palette = [
      "bg-amber-100 text-amber-900 border-amber-300",
      "bg-sky-100 text-sky-900 border-sky-300",
      "bg-emerald-100 text-emerald-900 border-emerald-300",
      "bg-violet-100 text-violet-900 border-violet-300",
      "bg-rose-100 text-rose-900 border-rose-300",
    ];
    let idx = 0;
    for (const [, membros] of grupos) {
      if (membros.length < 2) continue;
      const total = somarValoresMensais(membros as any);
      const label = ((membros[0] as any).grupo_soma || "").trim();
      const cor = palette[idx % palette.length];
      idx++;
      for (const m of membros) {
        map.set(m.id, { total, membros, label, cor });
      }
    }
    return map;
  }, [editMode, viewOps]);

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
    { label: "Faixa etária", field: "faixas_etarias", type: "textarea" },
  ];

  const camposComCorCelula = new Set<string>([
    "plano_nome",
    "coparticipacao",
    "acomodacao",
    "abrangencia",
    "reembolso",
    "rede_credenciada_resumo",
    "faixas_etarias",
    "valor_mensal",
  ]);

  const podePintarCelula = (field: string) => camposComCorCelula.has(field);

  const linhasOcultas = ((view as any)?.linhas_ocultas ?? []) as string[];
  // Em edit mode, mostra todas as linhas (admin vê tudo, com botão para ocultar/exibir).
  // No modo cliente, oculta as que estiverem em linhas_ocultas.
  const criteriosVisiveis = editMode
    ? criterios
    : criterios.filter((c) => !linhasOcultas.includes(c.field as string));

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

  const renderFaixasEtarias = (val: string | null | undefined) => {
    if (!val || !val.trim()) return <span className="text-muted-foreground">—</span>;
    const faixas = parseFaixasEtarias(val);
    if (faixas.length === 0) return <span className="whitespace-pre-line text-xs">{val}</span>;
    return (
      <details className="group rounded-md border border-border/60 bg-background/40 overflow-hidden">
        <summary className="cursor-pointer list-none px-2 py-1.5 text-xs font-medium flex items-center justify-between gap-2 hover:bg-muted/40 select-none">
          <span className="inline-flex items-center gap-1.5">
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
            Ver faixas ({faixas.length})
          </span>
          <span className="text-muted-foreground tabular-nums">
            {formatCurrency(Math.min(...faixas.map((f) => f.valor)))}+
          </span>
        </summary>
        <table className="w-full text-xs border-t border-border/60">
          <tbody>
            {faixas.map((f, i) => {
              const label = f.max >= 99 ? `${f.min}+` : `${f.min}–${f.max}`;
              return (
                <tr key={i} className={i % 2 ? "bg-muted/40" : ""}>
                  <td className="px-2 py-1 font-medium tabular-nums whitespace-nowrap">{label}</td>
                  <td className="px-2 py-1 text-right tabular-nums whitespace-nowrap">{formatCurrency(f.valor)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    );
  };

  // Renderiza a célula de Coparticipação (modo cliente). Quando Sim/Parcial e há detalhes, mostra mini-tabela em gaveta.
  const renderCoparticipacao = (op: Operadora) => {
    const valor = (op.coparticipacao ?? "").trim();
    const detalhes = parseCoparticipacaoDetalhes((op as any).coparticipacao_detalhes).filter((d) => d.valor.trim());
    const eSimOuParcial = /^(sim|parcial)$/i.test(valor);
    const labelTopo = valor || "—";

    if (!eSimOuParcial || detalhes.length === 0) {
      return <span className="whitespace-pre-line">{labelTopo}</span>;
    }
    return (
      <div className="space-y-1.5">
        <div className="font-medium">{labelTopo}</div>
        <details className="group rounded-md border border-border/60 bg-background/40 overflow-hidden">
          <summary className="cursor-pointer list-none px-2 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-muted/40 select-none">
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
            Ver detalhes ({detalhes.length})
          </summary>
          <table className="w-full text-xs border-t border-border/60">
            <tbody>
              {detalhes.map((d, i) => (
                <tr key={i} className={i % 2 ? "bg-muted/40" : ""}>
                  <td className="px-2 py-1 whitespace-nowrap">{d.item}</td>
                  <td className="px-2 py-1 text-right tabular-nums whitespace-nowrap font-medium">{d.valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    );
  };

  const renderEditableCell = (op: Operadora, crit: typeof criterios[number]) => {
    const value = (op[crit.field as keyof Operadora] as string | null) ?? "";
    if (crit.type === "sim_nao") {
      return (
        <Select value={value || ""} onValueChange={(v) => updateDraftOperadora(op.id, crit.field, v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Sim">Sim</SelectItem>
            <SelectItem value="Parcial">Parcial</SelectItem>
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

  // Seletor de cor para a OPERADORA inteira (aplica a todos os planos do grupo)
  const OperadoraColorPicker = ({ operadoraNome, planos }: { operadoraNome: string; planos: Operadora[] }) => {
    // pega a cor mais comum entre os planos como "atual"
    const current = (planos.find((p) => (p as any).cor_coluna)?.cor_coluna ?? null) as string | null;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-7 px-2 text-[11px] gap-1 shrink-0",
              current && COLUNA_COLORS[current]?.header
            )}
            title="Cor desta operadora"
          >
            <Palette className={cn("w-3 h-3", current ? "text-white" : "text-muted-foreground")} />
            Cor da operadora
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <p className="text-xs font-medium mb-2">Cor da operadora "{operadoraNome}"</p>
          <p className="text-[10px] text-muted-foreground mb-2">Aplica a todos os planos desta tabela.</p>
          {renderPalette(current, (k) => updateOperadoraColor(operadoraNome, k))}
        </PopoverContent>
      </Popover>
    );
  };

  // Cores por célula e por coluna de rótulos foram removidas — agora só a tabela inteira recebe cor (via OperadoraColorPicker).

  const headerClassFor = (op: Operadora) => {
    const c = getColunaColor((op as any).cor_coluna);
    return c ? c.header : "bg-primary text-primary-foreground";
  };
  const borderClassFor = (op: Operadora) => {
    const c = getColunaColor((op as any).cor_coluna);
    return c ? c.border : "border-primary";
  };
  const rotuloCellClassFor = (op: Operadora | undefined) => {
    if (!op) return "bg-muted/40 text-foreground";
    const c = getColunaColor((op as any).cor_coluna);
    return c ? c.cell : "bg-muted/40 text-foreground";
  };

  // ====== Renderização da tabela comparativa ======
  // Por padrão é usada para uma única operadora (uma tabela por operadora).
  // Quando `showOperadoraInHeader` é true, exibe o nome da operadora junto ao plano (usado no modal de comparação misturando operadoras).
  const renderComparativeTable = (ops: Operadora[], opts: { showOperadoraInHeader?: boolean } = {}) => {
    const { showOperadoraInHeader = false } = opts;
    // Para cada plano, usa o total do grupo de soma (se aplicável) — isso garante que
    // o cálculo de "economia vs. mais caro" e o destaque maior valor considerem o total do grupo.
    const totais = ops.map((op) => {
      const grupo = grupoSomaInfoById.get(op.id);
      return grupo ? grupo.total : (totalById.get(op.id) ?? null);
    });
    const maior = Math.max(...totais.filter((t): t is number => t !== null), 0);
    const algum = totais.some((t) => t !== null);

    return (
      <div className="rounded-lg border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={cn(
                  "text-left px-4 py-3 font-semibold w-56 align-top border-r border-border text-xs uppercase tracking-wide",
                  ops.length > 0 ? headerClassFor(ops[0]) : "bg-muted/60 text-muted-foreground"
                )}>
                  <div className="flex items-center justify-between gap-2">
                    <span>Planos</span>
                    {editMode && ops.length > 0 && (
                      <OperadoraColorPicker operadoraNome={ops[0].operadora_nome || ""} planos={ops} />
                    )}
                  </div>
                </th>
                {ops.map((op) => {
                  return (
                  <th
                    key={op.id}
                    className={cn(
                      "text-left px-4 py-3 font-semibold align-top border-r border-white/10 last:border-r-0 min-w-[180px] relative",
                      headerClassFor(op)
                    )}
                  >
                    {editMode && viewOps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Excluir a coluna "${op.plano_nome || op.operadora_nome || "este plano"}"?`)) {
                            removeDraftOperadora(op.id);
                          }
                        }}
                        title="Excluir esta coluna"
                        className="absolute top-1 right-1 w-6 h-6 rounded-md bg-white/15 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
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
                          {(() => {
                            const info = grupoSomaInfoById.get(op.id);
                            if (!info) return null;
                            const outros = info.membros
                              .filter((m) => m.id !== op.id)
                              .map((m) => m.plano_nome || m.operadora_nome)
                              .filter(Boolean)
                              .join(" + ");
                            return (
                              <div className={cn("mt-2 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border", info.cor)}>
                                <Plus className="w-2.5 h-2.5" />
                                Somado com: {outros || "outro plano"}
                              </div>
                            );
                          })()}
                          {op.destaque_comercial && DESTAQUE_LABELS[op.destaque_comercial] && (
                            <Badge className={`mt-2 text-[10px] px-2 py-0.5 ${DESTAQUE_COLORS[op.destaque_comercial]}`}>
                              {DESTAQUE_LABELS[op.destaque_comercial]}
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </th>
                  );
                })}
                {editMode && (
                  <th className="bg-muted/40 border-l border-border align-middle p-2 w-12">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Adicionar coluna nesta tabela"
                      onClick={() => addDraftOperadora(ops[0]?.operadora_nome)}
                      className="h-8 w-8 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {criteriosVisiveis.map((crit, rowIdx) => {
                const oculta = linhasOcultas.includes(crit.field as string);
                return (
                <tr key={crit.label} className={cn(rowIdx % 2 === 0 ? "bg-background" : "bg-muted/40", editMode && oculta && "opacity-60")}>
                  <td className="px-4 py-3 font-medium border-r border-border align-top text-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span>{crit.label}{editMode && oculta && <span className="ml-1 text-[10px] opacity-70">(oculta)</span>}</span>
                      {editMode && (
                        <button
                          type="button"
                          onClick={() => toggleLinhaOculta(crit.field as string)}
                          className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted/30 shrink-0"
                          title={oculta ? "Exibir esta linha para o cliente" : "Ocultar esta linha do cliente"}
                        >
                          {oculta ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>
                  {ops.map((op) => {
                    return (
                      <td
                        key={op.id}
                        className="px-4 py-3 text-foreground border-r border-border last:border-r-0 align-top"
                      >
                        {editMode ? (
                          <div className="space-y-1">
                            <div className="flex-1 min-w-0">{renderEditableCell(op, crit)}</div>
                            {crit.field === "coparticipacao" && <CoparticipacaoEditor op={op} onChange={updateDraftOperadora} />}
                          </div>
                        ) : (
                          crit.field === "faixas_etarias"
                            ? renderFaixasEtarias(op[crit.field as keyof Operadora] as string | null)
                            : crit.field === "coparticipacao"
                              ? renderCoparticipacao(op)
                              : renderCellValue(op[crit.field as keyof Operadora] as string | null)
                        )}
                      </td>
                    );
                  })}
                  {editMode && <td className="bg-muted/30 border-l border-border w-12" />}
                </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="text-primary-foreground bg-primary">
                <td className="px-4 py-4 font-bold uppercase tracking-wide text-sm border-r border-primary-foreground/10">
                  Mensalidade Total
                </td>
                {ops.map((op, i) => {
                  const grupoInfo = grupoSomaInfoById.get(op.id);
                  const valorExibido = grupoInfo ? grupoInfo.total : totais[i];
                  return (
                    <td key={op.id} className="px-4 py-4 font-bold text-lg border-r border-primary-foreground/10 last:border-r-0 align-top">
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
                      ) : (
                        <div>
                          {valorExibido !== null ? formatCurrency(valorExibido) : "—"}
                          {grupoInfo && (
                            <div className="text-[10px] font-normal opacity-80 mt-0.5 normal-case tracking-normal">
                              total do grupo
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
                {editMode && <td className="border-l border-primary-foreground/10 w-12 bg-primary" />}
              </tr>
              {!editMode && algum && ops.length > 1 && (
                <tr className="bg-accent/20">
                  <td className="px-4 py-3 font-medium text-foreground border-r border-border">Economia vs. mais caro</td>
                  {ops.map((op, i) => {
                    const grupoInfo = grupoSomaInfoById.get(op.id);
                    const t = grupoInfo ? grupoInfo.total : totais[i];
                    const economia = t !== null ? maior - t : 0;
                    return (
                      <td key={op.id} className="px-4 py-3 font-semibold text-foreground border-r border-border last:border-r-0">
                        {economia > 0 ? formatCurrency(economia) : "—"}
                      </td>
                    );
                  })}
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
                  <Button variant="outline" size="sm" onClick={() => addDraftOperadora()} disabled={saving}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar coluna
                  </Button>
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
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{g.nome}</h2>
              </div>
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
            <div className="flex items-center justify-between gap-2 border-b pb-1 flex-wrap">
              <h2 className="text-sm uppercase tracking-wider font-semibold text-muted-foreground">
                {g.nome}
              </h2>
              {editMode && <OperadoraColorPicker operadoraNome={g.nome} planos={g.planos} />}
            </div>
            {g.planos.map((op) => {
              const grupoInfo = grupoSomaInfoById.get(op.id);
              const total = grupoInfo ? grupoInfo.total : (totalById.get(op.id) ?? null);
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
                            <div className="flex items-center gap-1 flex-wrap">
                              <ColorPicker op={op} />
                            </div>
                          </div>
                        ) : (
                          <>
                            {op.plano_nome && <h3 className="font-bold text-lg leading-tight">{op.plano_nome}</h3>}
                            {grupoInfo && (() => {
                              const outros = grupoInfo.membros
                                .filter((m) => m.id !== op.id)
                                .map((m) => m.plano_nome || m.operadora_nome)
                                .filter(Boolean)
                                .join(" + ");
                              return (
                                <div className={cn("mt-2 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border", grupoInfo.cor)}>
                                  <Plus className="w-2.5 h-2.5" />
                                  Somado com: {outros || "outro plano"}
                                </div>
                              );
                            })()}
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
                    <div className="mt-3 pt-3 border-t border-white/20 -mx-4 -mb-4 px-4 pb-4">
                      <p className="text-xs opacity-80 uppercase tracking-wide">
                        Mensalidade Total{grupoInfo ? " (grupo)" : ""}
                      </p>
                      {editMode ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={op.valor_mensal ?? ""}
                          onChange={(e) =>
                            updateDraftOperadora(op.id, "valor_mensal", e.target.value === "" ? null : parseFloat(e.target.value))
                          }
                          className="h-9 text-base text-foreground mt-1"
                        />
                      ) : (
                        <p className="text-2xl font-bold">{total !== null ? formatCurrency(total) : "—"}</p>
                      )}
                    </div>
                  </div>
                  <div className="p-4 space-y-3 text-sm">
                    {criteriosVisiveis.map((crit) => {
                      const v = op[crit.field as keyof Operadora] as string | null;
                      if (!editMode && !v) return null;
                      const oculta = linhasOcultas.includes(crit.field as string);
                      return (
                        <div
                          key={crit.label}
                          className={cn(
                            "flex flex-col gap-1 pb-2 border-b last:border-b-0 -mx-2 px-2 rounded",
                            editMode && oculta && "opacity-60"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {crit.label}{editMode && oculta && <span className="ml-1 normal-case">(oculta)</span>}
                            </span>
                            {editMode && (
                              <button
                                type="button"
                                onClick={() => toggleLinhaOculta(crit.field as string)}
                                className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted shrink-0"
                                title={oculta ? "Exibir esta linha" : "Ocultar do cliente"}
                              >
                                {oculta ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                          <div className="text-foreground space-y-1">
                            {editMode ? (
                              <>
                                {renderEditableCell(op, crit)}
                                {crit.field === "coparticipacao" && <CoparticipacaoEditor op={op} onChange={updateDraftOperadora} />}
                              </>
                            ) : (
                              crit.field === "faixas_etarias"
                                ? renderFaixasEtarias(v)
                                : crit.field === "coparticipacao"
                                  ? renderCoparticipacao(op)
                                  : renderCellValue(v)
                            )}
                          </div>
                        </div>
                      );
                    })}
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
