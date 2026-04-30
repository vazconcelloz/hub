import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  PropostaAuto,
  AutoCotacao,
  AutoCotacaoInsert,
  formatCurrency,
} from "@/lib/proposal-auto-utils";
import {
  DESTAQUE_LABELS,
  DESTAQUE_COLORS,
  COLUNA_COLORS,
  getColunaColor,
} from "@/lib/proposal-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  MessageCircle,
  Car,
  Calendar,
  FileText,
  Pencil,
  Save,
  X,
  Plus,
  Trash2,
  Palette,
  Check,
  Loader2,
  CreditCard,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import heroBg from "@/assets/proposta-hero-bg.jpg";

// ============== Formas de pagamento (gaveta) ==============
interface FormaPagamento {
  tipo: string;
  descricao: string;
}

const FORMA_TIPOS = [
  "Cartão de crédito",
  "Cartão de débito",
  "Boleto",
  "Débito em conta",
  "PIX",
  "Dinheiro",
  "Transferência",
];

const FORMA_PADRAO: FormaPagamento[] = [
  { tipo: "Cartão de crédito", descricao: "" },
  { tipo: "Boleto", descricao: "" },
];

function parseFormasPagamento(raw: any): FormaPagamento[] {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(arr)) {
      return arr
        .filter((x) => x && typeof x === "object")
        .map((x: any) => ({
          tipo: String(x.tipo ?? ""),
          descricao: String(x.descricao ?? ""),
        }));
    }
  } catch {
    /* noop */
  }
  return [];
}

const fmt = (v: number | null | undefined) =>
  v == null ? "—" : formatCurrency(v);
const txt = (v: string | null | undefined) =>
  v && v.trim() ? v : "—";

// Parse de número BR (R$ 4.154,35 -> 4154.35)
const parseNum = (s: string): number | null => {
  const raw = (s || "").trim().replace(/[^\d,.-]/g, "");
  if (!raw) return null;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(raw)
      ? raw.replace(/\./g, "")
      : raw;
  const v = Number(normalized);
  return Number.isFinite(v) ? v : null;
};

type FieldType = "text" | "number";

interface Criterio {
  label: string;
  field: keyof AutoCotacao;
  type: FieldType;
  render: (c: AutoCotacao) => React.ReactNode;
}

const CRITERIOS: Criterio[] = [
  { label: "Cobertura", field: "cobertura_resumo", type: "text", render: (c) => txt(c.cobertura_resumo) },
  {
    label: "Franquia (R$)",
    field: "franquia_valor",
    type: "number",
    render: (c) => fmt(c.franquia_valor),
  },
  { label: "Tipo de franquia", field: "franquia_tipo", type: "text", render: (c) => txt(c.franquia_tipo) },
  { label: "% FIPE / Indenização", field: "percentual_fipe", type: "text", render: (c) => txt(c.percentual_fipe) },
  { label: "Danos materiais", field: "danos_materiais", type: "number", render: (c) => fmt(c.danos_materiais) },
  { label: "Danos corporais", field: "danos_corporais", type: "number", render: (c) => fmt(c.danos_corporais) },
  { label: "Danos morais", field: "danos_morais", type: "number", render: (c) => fmt(c.danos_morais) },
  { label: "APP morte/invalidez", field: "app_morte_invalidez", type: "number", render: (c) => fmt(c.app_morte_invalidez) },
  { label: "Assistência 24h", field: "assistencia_24h", type: "text", render: (c) => txt(c.assistencia_24h) },
  { label: "Vidros", field: "vidros", type: "text", render: (c) => txt(c.vidros) },
  { label: "Carro reserva", field: "carro_reserva", type: "text", render: (c) => txt(c.carro_reserva) },
];

// Cota��o vazia (template para "Adicionar")
const emptyCotacao = (proposta_id: string, ordem: number): AutoCotacao => ({
  id: `tmp-${Math.random().toString(36).slice(2)}`,
  proposta_id,
  seguradora_nome: "Nova seguradora",
  produto_nome: null,
  premio_total: null,
  cobertura_resumo: null,
  franquia_valor: null,
  franquia_tipo: null,
  percentual_fipe: null,
  danos_materiais: null,
  danos_corporais: null,
  danos_morais: null,
  app_morte_invalidez: null,
  assistencia_24h: null,
  vidros: null,
  carro_reserva: null,
  parcelamento: null,
  formas_pagamento: null,
  formas_pagamento_detalhes: null,
  destaque_comercial: null,
  cor_coluna: null,
  cores_celulas: null,
  pdf_url: null,
  ordem_exibicao: ordem,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export default function PublicPropostaAutoPage() {
  const { slug } = useParams();
  const { toast } = useToast();
  const [proposta, setProposta] = useState<PropostaAuto | null>(null);
  const [cotacoes, setCotacoes] = useState<AutoCotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Modo de edi��o (apenas admin logado)
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<AutoCotacao[]>([]);
  const [saving, setSaving] = useState(false);

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

      // detecta admin (qualquer usuário autenticado pode editar — RLS valida)
      const { data: { user } } = await supabase.auth.getUser();
      setIsAdmin(!!user);

      setLoading(false);
    })();
  }, [slug]);

  const enterEdit = () => {
    setDraft(cotacoes.map((c) => ({ ...c })));
    setEditMode(true);
  };
  const cancelEdit = () => {
    setDraft([]);
    setEditMode(false);
  };

  const updateDraft = (id: string, field: keyof AutoCotacao, value: any) => {
    setDraft((d) => d.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const addCotacao = () => {
    if (!proposta) return;
    setDraft((d) => [...d, emptyCotacao(proposta.id, d.length + 1)]);
  };

  const removeCotacao = (id: string) => {
    setDraft((d) => d.filter((c) => c.id !== id));
  };

  const saveEdit = async () => {
    if (!proposta) return;
    setSaving(true);
    try {
      // Estratégia simples e consistente com o form admin:
      // deleta todas as cota��es e re-insere a partir do draft.
      const { error: delErr } = await supabase
        .from("proposta_auto_seguradoras")
        .delete()
        .eq("proposta_id", proposta.id);
      if (delErr) throw delErr;

      if (draft.length) {
        const rows: AutoCotacaoInsert[] = draft.map((c, i) => ({
          proposta_id: proposta.id,
          seguradora_nome: c.seguradora_nome || "Sem nome",
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
          formas_pagamento_detalhes: c.formas_pagamento_detalhes,
          destaque_comercial: c.destaque_comercial,
          cor_coluna: c.cor_coluna,
          ordem_exibicao: i + 1,
        }));
        const { data: inserted, error: insErr } = await supabase
          .from("proposta_auto_seguradoras")
          .insert(rows)
          .select();
        if (insErr) throw insErr;
        setCotacoes(inserted || []);
      } else {
        setCotacoes([]);
      }

      setEditMode(false);
      setDraft([]);
      toast({ title: "Alterações salvas!" });
    } catch (e: any) {
      toast({
        title: "Erro ao salvar",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Paleta para cor da coluna
  const ColorPalette = ({
    current,
    onPick,
  }: {
    current: string | null | undefined;
    onPick: (k: string | null) => void;
  }) => (
    <div className="grid grid-cols-5 gap-1.5">
      <button
        type="button"
        onClick={() => onPick(null)}
        className={cn(
          "h-8 col-span-5 rounded text-[11px] bg-muted text-muted-foreground",
          !current && "ring-2 ring-offset-1 ring-foreground"
        )}
      >
        Sem cor
      </button>
      {Object.entries(COLUNA_COLORS).map(([k, c]) => (
        <button
          key={k}
          type="button"
          onClick={() => onPick(k)}
          className={cn(
            "h-8 rounded flex items-center justify-center",
            c.header,
            current === k && "ring-2 ring-offset-1 ring-foreground"
          )}
          title={c.label}
        >
          {current === k && <Check className="w-3 h-3" />}
        </button>
      ))}
    </div>
  );

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

  // Lista visualizada: draft em edi��o, cota��es publicadas no modo leitura.
  const view = editMode ? draft : cotacoes;

  // Render de uma c�lula edit�vel para um crit�rio + cota��o
  const renderEditableCell = (c: AutoCotacao, crit: Criterio) => {
    const value = (c as any)[crit.field];
    if (crit.type === "number") {
      return (
        <Input
          value={value == null ? "" : String(value)}
          onChange={(e) =>
            updateDraft(c.id, crit.field, parseNum(e.target.value))
          }
          placeholder="0,00"
          className="h-8 text-sm text-center"
        />
      );
    }
    return (
      <Input
        value={value ?? ""}
        onChange={(e) => updateDraft(c.id, crit.field, e.target.value || null)}
        className="h-8 text-sm text-center"
      />
    );
  };

  // ============== Célula "Formas de pagamento" (gaveta) ==============
  const FormasPagamentoCell = ({ c }: { c: AutoCotacao }) => {
    const lista = parseFormasPagamento((c as any).formas_pagamento_detalhes);

    if (editMode) {
      const atual = lista.length > 0 ? lista : FORMA_PADRAO;
      const update = (next: FormaPagamento[]) => {
        const limpos = next.filter((d) => d.tipo.trim() || d.descricao.trim());
        updateDraft(
          c.id,
          "formas_pagamento_detalhes" as any,
          limpos.length > 0 ? (limpos as any) : null
        );
      };
      return (
        <div className="rounded-md border border-border/60 bg-background/60 p-2 space-y-1.5">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-left">
            Opções de pagamento
          </div>
          {atual.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Select
                value={d.tipo || ""}
                onValueChange={(v) => {
                  const next = [...atual];
                  next[i] = { ...next[i], tipo: v };
                  update(next);
                }}
              >
                <SelectTrigger className="h-7 text-xs w-36">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  {FORMA_TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={d.descricao}
                onChange={(e) => {
                  const next = [...atual];
                  next[i] = { ...next[i], descricao: e.target.value };
                  update(next);
                }}
                placeholder="Ex.: até 10x sem juros"
                className="h-7 text-xs flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  const next = atual.filter((_, idx) => idx !== i);
                  update(next);
                }}
                className="text-muted-foreground hover:text-destructive p-1"
                title="Remover"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[11px] w-full"
            onClick={() => update([...atual, { tipo: "", descricao: "" }])}
          >
            <Plus className="w-3 h-3 mr-1" /> Adicionar opção
          </Button>
        </div>
      );
    }

    // Modo leitura: gaveta colapsável
    if (lista.length === 0) {
      return <span className="text-muted-foreground text-xs">—</span>;
    }
    return (
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <CreditCard className="w-3.5 h-3.5" />
            {lista.length} {lista.length === 1 ? "opção" : "opções"}
            <ChevronDown className="w-3 h-3 transition-transform data-[state=open]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <ul className="text-xs text-left space-y-1 bg-muted/40 rounded-md p-2 border border-border/60">
            {lista.map((d, i) => (
              <li key={i} className="flex flex-col">
                <span className="font-semibold text-foreground">{d.tipo || "—"}</span>
                {d.descricao && (
                  <span className="text-muted-foreground">{d.descricao}</span>
                )}
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    );
  };

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

      {/* Barra de admin */}
      {isAdmin && (
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
          <div className="container py-2 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Modo administrador {editMode && <span className="text-foreground font-medium">— editando inline</span>}
            </p>
            <div className="flex items-center gap-2">
              {!editMode ? (
                <Button size="sm" variant="outline" onClick={enterEdit}>
                  <Pencil className="w-4 h-4 mr-1" /> Editar cotações
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={addCotacao}>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar seguradora
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
                    <X className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={saveEdit} disabled={saving}>
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    Salvar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {view.length === 0 ? (
        <section className="container py-16 text-center">
          <Card className="p-10 max-w-lg mx-auto">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">
              Nenhuma cotação cadastrada ainda.
            </p>
            {editMode && (
              <Button className="mt-4" onClick={addCotacao}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar primeira cotação
              </Button>
            )}
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
                    {view.map((c) => {
                      const col = getColunaColor(c.cor_coluna);
                      const destKey = c.destaque_comercial || "";
                      const destLabel =
                        DESTAQUE_LABELS[destKey] ||
                        (destKey && !DESTAQUE_LABELS[destKey] ? destKey : null);
                      const destClass =
                        DESTAQUE_COLORS[destKey] ||
                        "bg-primary text-primary-foreground";
                      return (
                        <th
                          key={c.id}
                          className={cn(
                            "px-4 py-4 text-center align-bottom min-w-[220px]",
                            col ? col.header : ""
                          )}
                        >
                          {editMode ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-end gap-1">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-[11px] gap-1 text-foreground"
                                    >
                                      <Palette className="w-3 h-3" />
                                      Cor
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64 p-3">
                                    <p className="text-xs font-medium mb-2">
                                      Cor da coluna
                                    </p>
                                    <ColorPalette
                                      current={c.cor_coluna}
                                      onPick={(k) =>
                                        updateDraft(c.id, "cor_coluna", k)
                                      }
                                    />
                                  </PopoverContent>
                                </Popover>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => removeCotacao(c.id)}
                                  title="Remover cotação"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              </div>
                              <Input
                                value={c.seguradora_nome ?? ""}
                                onChange={(e) =>
                                  updateDraft(
                                    c.id,
                                    "seguradora_nome",
                                    e.target.value
                                  )
                                }
                                placeholder="Seguradora"
                                className="h-8 text-sm font-semibold text-foreground"
                              />
                              <Input
                                value={c.produto_nome ?? ""}
                                onChange={(e) =>
                                  updateDraft(
                                    c.id,
                                    "produto_nome",
                                    e.target.value || null
                                  )
                                }
                                placeholder="Produto / Plano"
                                className="h-7 text-xs text-foreground"
                              />
                              <Select
                                value={c.destaque_comercial || "none"}
                                onValueChange={(v) =>
                                  updateDraft(
                                    c.id,
                                    "destaque_comercial",
                                    v === "none" ? null : v
                                  )
                                }
                              >
                                <SelectTrigger className="h-7 text-xs text-foreground">
                                  <SelectValue placeholder="Sem destaque" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Sem destaque</SelectItem>
                                  {Object.entries(DESTAQUE_LABELS).map(
                                    ([k, v]) => (
                                      <SelectItem key={k} value={k}>
                                        {v}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p
                                className={cn(
                                  "text-xs uppercase tracking-wider",
                                  col ? "text-white/80" : "text-muted-foreground"
                                )}
                              >
                                {c.seguradora_nome}
                              </p>
                              <p
                                className={cn(
                                  "font-bold",
                                  col ? "text-white" : "text-foreground"
                                )}
                              >
                                {txt(c.produto_nome)}
                              </p>
                              {destLabel && (
                                <Badge className={cn("mt-1", destClass)}>
                                  {destLabel}
                                </Badge>
                              )}
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                  <tr className="bg-primary/5">
                    <th className="text-left px-4 py-3 font-semibold text-foreground">
                      Prêmio total
                    </th>
                    {view.map((c) => (
                      <th key={c.id} className="px-4 py-3 text-center">
                        {editMode ? (
                          <div className="space-y-1">
                            <Input
                              value={
                                c.premio_total == null
                                  ? ""
                                  : String(c.premio_total)
                              }
                              onChange={(e) =>
                                updateDraft(
                                  c.id,
                                  "premio_total",
                                  parseNum(e.target.value)
                                )
                              }
                              placeholder="0,00"
                              className="h-8 text-base font-bold text-center text-primary"
                            />
                            <Input
                              value={c.parcelamento ?? ""}
                              onChange={(e) =>
                                updateDraft(
                                  c.id,
                                  "parcelamento",
                                  e.target.value || null
                                )
                              }
                              placeholder="Ex.: 10x R$ 415,39"
                              className="h-7 text-xs text-center"
                            />
                          </div>
                        ) : (
                          <>
                            <p className="text-xl font-bold text-primary">
                              {fmt(c.premio_total)}
                            </p>
                            {c.parcelamento && (
                              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                                {c.parcelamento}
                              </p>
                            )}
                          </>
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
                      {view.map((c) => (
                        <td
                          key={c.id}
                          className="px-4 py-3 text-center text-muted-foreground"
                        >
                          {editMode ? renderEditableCell(c, crit) : crit.render(c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className={CRITERIOS.length % 2 ? "bg-muted/20" : ""}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      Formas de pagamento
                    </td>
                    {view.map((c) => (
                      <td key={c.id} className="px-4 py-3 text-center align-top">
                        <FormasPagamentoCell c={c} />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Cards (mobile) */}
          <section className="container py-6 md:hidden space-y-4">
            {view.map((c) => {
              const col = getColunaColor(c.cor_coluna);
              const destKey = c.destaque_comercial || "";
              const destLabel =
                DESTAQUE_LABELS[destKey] ||
                (destKey && !DESTAQUE_LABELS[destKey] ? destKey : null);
              const destClass =
                DESTAQUE_COLORS[destKey] ||
                "bg-primary text-primary-foreground";
              return (
                <Card
                  key={c.id}
                  className={cn(
                    "overflow-hidden p-0",
                    col && `border-t-4 ${col.border}`
                  )}
                >
                  <div className={cn("p-4", col ? col.header : "bg-muted/30")}>
                    {editMode ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-end gap-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] gap-1 text-foreground"
                              >
                                <Palette className="w-3 h-3" /> Cor
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3">
                              <ColorPalette
                                current={c.cor_coluna}
                                onPick={(k) =>
                                  updateDraft(c.id, "cor_coluna", k)
                                }
                              />
                            </PopoverContent>
                          </Popover>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => removeCotacao(c.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                        <Input
                          value={c.seguradora_nome ?? ""}
                          onChange={(e) =>
                            updateDraft(
                              c.id,
                              "seguradora_nome",
                              e.target.value
                            )
                          }
                          placeholder="Seguradora"
                          className="h-8 text-foreground"
                        />
                        <Input
                          value={c.produto_nome ?? ""}
                          onChange={(e) =>
                            updateDraft(
                              c.id,
                              "produto_nome",
                              e.target.value || null
                            )
                          }
                          placeholder="Produto"
                          className="h-7 text-xs text-foreground"
                        />
                        <Select
                          value={c.destaque_comercial || "none"}
                          onValueChange={(v) =>
                            updateDraft(
                              c.id,
                              "destaque_comercial",
                              v === "none" ? null : v
                            )
                          }
                        >
                          <SelectTrigger className="h-7 text-xs text-foreground">
                            <SelectValue placeholder="Sem destaque" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem destaque</SelectItem>
                            {Object.entries(DESTAQUE_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p
                            className={cn(
                              "text-xs uppercase tracking-wider",
                              col ? "text-white/80" : "text-muted-foreground"
                            )}
                          >
                            {c.seguradora_nome}
                          </p>
                          <h3
                            className={cn(
                              "font-bold",
                              col ? "text-white" : "text-foreground"
                            )}
                          >
                            {txt(c.produto_nome)}
                          </h3>
                        </div>
                        {destLabel && (
                          <Badge className={destClass}>{destLabel}</Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="bg-primary/5 rounded-lg p-3 text-center mb-4">
                      <p className="text-xs uppercase text-muted-foreground">
                        Prêmio total
                      </p>
                      {editMode ? (
                        <div className="space-y-1 mt-1">
                          <Input
                            value={
                              c.premio_total == null
                                ? ""
                                : String(c.premio_total)
                            }
                            onChange={(e) =>
                              updateDraft(
                                c.id,
                                "premio_total",
                                parseNum(e.target.value)
                              )
                            }
                            placeholder="0,00"
                            className="h-9 text-lg font-bold text-center text-primary"
                          />
                          <Input
                            value={c.parcelamento ?? ""}
                            onChange={(e) =>
                              updateDraft(
                                c.id,
                                "parcelamento",
                                e.target.value || null
                              )
                            }
                            placeholder="Parcelamento"
                            className="h-7 text-xs text-center"
                          />
                        </div>
                      ) : (
                        <>
                          <p className="text-2xl font-bold text-primary">
                            {fmt(c.premio_total)}
                          </p>
                          {c.parcelamento && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {c.parcelamento}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <dl className="space-y-2 text-sm">
                      {CRITERIOS.map((crit) => (
                        <div
                          key={crit.label}
                          className="flex justify-between items-center gap-3 border-b border-border/60 pb-1.5 last:border-0"
                        >
                          <dt className="text-muted-foreground shrink-0">
                            {crit.label}
                          </dt>
                          <dd className="text-right text-foreground font-medium flex-1 min-w-0">
                            {editMode ? renderEditableCell(c, crit) : crit.render(c)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </Card>
              );
            })}
          </section>
        </>
      )}

      {/* CTA WhatsApp */}
      {!editMode && tel && (
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

      {!editMode && proposta.observacoes_gerais && (
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
