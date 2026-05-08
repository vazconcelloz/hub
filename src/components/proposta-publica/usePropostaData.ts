import { useState, useEffect, useMemo } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { db } from "@/lib/db";
import { toast } from "sonner";

import type { Proposta, Operadora } from "@/lib/proposal-utils";
import {
  formatPhone,
  agruparPorOperadora,
  somarValoresMensais,
  parseFaixasEtarias,
  parseIdades,
  calcularTotalPorFaixas,
} from "@/lib/proposal-utils";

import type { EditableOperadoraField, GrupoSomaInfo, CriterioDefinition, PropostaContext } from "./types";

// ——— Constants ———
const CRITERIOS: CriterioDefinition[] = [
  { label: "Coparticipação", field: "coparticipacao", type: "sim_nao" },
  { label: "Acomodação", field: "acomodacao", type: "acomodacao" },
  { label: "Abrangência", field: "abrangencia", type: "text" },
  { label: "Reembolso", field: "reembolso", type: "reembolso" },
  { label: "Rede credenciada", field: "rede_credenciada_resumo", type: "textarea" },
  { label: "Faixa etária", field: "faixas_etarias", type: "textarea" },
];

function createEmptyOperadora(propostaId: string, nomeFinal: string, maxOrdem: number): Operadora {
  return {
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    proposta_id: propostaId,
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
  };
}

export function usePropostaData() {
  const { slug } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftProposta, setDraftProposta] = useState<Proposta | null>(null);
  const [draftOperadoras, setDraftOperadoras] = useState<Operadora[]>([]);

  // Comparison state
  const [selectedPlans, setSelectedPlans] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);

  const isPortalPreview =
    location.pathname.startsWith("/admin/cotacao/") ||
    location.pathname.startsWith("/app/cotacoes/saude/cotacao/") ||
    searchParams.get("portal") === "1";

  const canEdit = useMemo(
    () => isPortalPreview && !!proposta,
    [isPortalPreview, proposta]
  );

  // ——— Data loading ———
  const loadProposta = async () => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const { data: prop } = await db.from("propostas").select("*").eq("slug", slug).single();
    if (!prop) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setProposta(prop);

    const { data: ops } = await db
      .from("proposta_operadoras")
      .select("*")
      .eq("proposta_id", prop.id)
      .order("ordem_exibicao");
    setOperadoras(ops || []);
    setLoading(false);
  };

  useEffect(() => {
    loadProposta();
  }, [slug]);

  // ——— Edit actions ———
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
      const maxOrdem = ops.reduce((m, o) => Math.max(m, o.ordem_exibicao ?? 0), 0);
      const nomeFinal =
        (operadoraNome && operadoraNome.trim()) ||
        (ops.length > 0 ? ops[ops.length - 1].operadora_nome : "Nova Operadora");
      return [...ops, createEmptyOperadora(proposta?.id ?? "", nomeFinal, maxOrdem)];
    });
    toast.success("Coluna adicionada", { description: "Edite o nome do plano e demais campos." });
  };

  const addDraftSeguradora = () => {
    setDraftOperadoras((ops) => {
      const base = "Nova Seguradora";
      const nomesExistentes = new Set(
        ops.map((o) => (o.operadora_nome ?? "").trim().toLowerCase())
      );
      let nomeFinal = base;
      let i = 2;
      while (nomesExistentes.has(nomeFinal.trim().toLowerCase())) {
        nomeFinal = `${base} ${i++}`;
      }
      const maxOrdem = ops.reduce((m, o) => Math.max(m, o.ordem_exibicao ?? 0), 0);
      return [...ops, createEmptyOperadora(proposta?.id ?? "", nomeFinal, maxOrdem)];
    });
    toast.success("Seguradora adicionada", { description: "Uma nova tabela foi criada. Edite o nome da seguradora e os planos." });
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

  const updateOperadoraColor = (operadoraNome: string, colorKey: string | null) => {
    setDraftOperadoras((ops) =>
      ops.map((o) =>
        (o.operadora_nome ?? "").trim().toLowerCase() === operadoraNome.trim().toLowerCase()
          ? { ...o, cor_coluna: colorKey }
          : o
      )
    );
  };

  const toggleLinhaOculta = (field: string) => {
    setDraftProposta((p) => {
      if (!p) return p;
      const atual = (p.linhas_ocultas ?? []) as string[];
      const next = atual.includes(field) ? atual.filter((f) => f !== field) : [...atual, field];
      return { ...p, linhas_ocultas: next };
    });
  };

  // ——— Save ———
  const handleSave = async () => {
    if (!draftProposta || !proposta) return;
    setSaving(true);
    try {
      const { error: e1 } = await db
        .from("propostas")
        .update({
          nome_cliente: draftProposta.nome_cliente,
          cidade: draftProposta.cidade,
          estado: draftProposta.estado,
          tipo_produto: draftProposta.tipo_produto,
          validade_proposta: draftProposta.validade_proposta,
          linhas_ocultas: draftProposta.linhas_ocultas ?? [],
          cores_rotulos: draftProposta.cores_rotulos ?? null,
        })
        .eq("id", proposta.id);
      if (e1) throw e1;

      // 1) Insert new columns
      const novas = draftOperadoras.filter((d) => String(d.id).startsWith("new-"));
      if (novas.length > 0) {
        const { error: eIns } = await db
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
            ordem_exibicao: d.ordem_exibicao ?? 0,
            cor_coluna: d.cor_coluna,
            cores_celulas: d.cores_celulas ?? null,
            coparticipacao_detalhes: d.coparticipacao_detalhes ?? null,
            grupo_soma: (d.grupo_soma || "").trim() || null,
            faixas_etarias: d.faixas_etarias ?? null,
            previsao_reajuste_faixa: d.previsao_reajuste_faixa ?? null,
          })));
        if (eIns) throw eIns;
      }

      // 2) Delete removed columns
      const draftIds = new Set(draftOperadoras.map((d) => d.id));
      const removidas = operadoras.filter((o) => !draftIds.has(o.id));
      if (removidas.length > 0) {
        const { error: eDel } = await db
          .from("proposta_operadoras")
          .delete()
          .in("id", removidas.map((o) => o.id));
        if (eDel) throw eDel;
      }

      // 3) Update changed columns
      for (const draft of draftOperadoras) {
        if (String(draft.id).startsWith("new-")) continue;
        const original = operadoras.find((o) => o.id === draft.id);
        if (!original) continue;
        const fieldsToCheck: EditableOperadoraField[] = [
          "operadora_nome", "plano_nome", "valor_mensal", "coparticipacao", "acomodacao",
          "abrangencia", "reembolso", "resumo_cobertura", "rede_credenciada_resumo",
          "destaque_comercial", "cor_coluna", "cores_celulas", "coparticipacao_detalhes", "grupo_soma",
        ];
        const changed = fieldsToCheck.some((f) => {
          const a = original[f as keyof Operadora];
          const b = draft[f as keyof Operadora];
          if (f === "cores_celulas" || f === "coparticipacao_detalhes") return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
          return a !== b;
        });
        if (!changed) continue;

        const { error: e2 } = await db
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
            cor_coluna: draft.cor_coluna,
            cores_celulas: draft.cores_celulas ?? null,
            coparticipacao_detalhes: draft.coparticipacao_detalhes ?? null,
            grupo_soma: (draft.grupo_soma || "").trim() || null,
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

  // ——— Derived data ———
  const view = editMode && draftProposta ? draftProposta : proposta;
  const viewOps = editMode ? draftOperadoras : operadoras;

  const grupoSomaInfoById = useMemo(() => {
    const map = new Map<string, GrupoSomaInfo>();
    if (editMode) return map;
    const grupos = new Map<string, Operadora[]>();
    for (const op of viewOps) {
      const g = (op.grupo_soma || "").trim();
      if (!g) continue;
      const key = g.toLowerCase();
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key)!.push(op);
    }
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
      const total = somarValoresMensais(membros);
      const label = (membros[0].grupo_soma || "").trim();
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
    const faixasRaw = op.faixas_etarias;
    const idadesRaw = view?.idades_beneficiarios ?? null;
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

  const toggleSelected = (id: string) => {
    setSelectedPlans((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ——— Computed groups / totals / visibility ———
  const grupos = view ? agruparPorOperadora(viewOps) : [];

  const totalById = new Map<string, number | null>();
  viewOps.forEach((op) => totalById.set(op.id, getTotalMensal(op)));

  const linhasOcultas = view?.linhas_ocultas ?? [];
  const criteriosVisiveis = editMode
    ? CRITERIOS
    : CRITERIOS.filter((c) => !linhasOcultas.includes(c.field as string));

  // ——— Return context ———
  const ctx: PropostaContext | null = proposta && view ? {
    proposta,
    view,
    viewOps,
    editMode,
    saving,
    canEdit,
    handleEnterEdit,
    handleCancelEdit,
    handleSave,
    addDraftOperadora,
    addDraftSeguradora,
    removeDraftOperadora,
    updateDraftProposta,
    updateDraftOperadora,
    updateOperadoraColor,
    toggleLinhaOculta,
    selectedPlans,
    toggleSelected,
    setSelectedPlans,
    compareOpen,
    setCompareOpen,
    grupos,
    grupoSomaInfoById,
    totalById,
    criteriosVisiveis,
    linhasOcultas,
    getTotalMensal,
    whatsappLink,
    generalWhatsapp,
  } : null;

  return { loading, notFound, ctx };
}
