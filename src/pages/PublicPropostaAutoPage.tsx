import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { db } from "@/lib/db";
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
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  MessageCircle,
  Car,
  Calendar,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  UserCheck,
  CreditCard,
  ChevronDown,
  Edit2,
  Eye as EyeIcon,
  Plus,
  Trash2,
  Save as SaveIcon,
  X,
  Palette,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import heroBg from "@/assets/proposta-hero-bg.jpg";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

const NAO_INCLUSO = "Não incluso";
const isNaoInclusoNum = (v: number | null | undefined) => v === -1;
const isNaoInclusoTxt = (v: string | null | undefined) =>
  !!v && v.trim().toLowerCase() === "não incluso";

const fmt = (v: number | null | undefined) =>
  isNaoInclusoNum(v) ? NAO_INCLUSO : v == null ? "—" : formatCurrency(v);
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
  { label: "Produto / Plano", field: "produto_nome", type: "text", render: (c) => txt(c.produto_nome) },
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

export default function PublicPropostaAutoPage() {
  const { slug } = useParams();
  const location = useLocation();
  const { toast } = useToast();

  const isAdmin = location.pathname.startsWith("/app");
  const [editMode, setEditMode] = useState(false);

  const [proposta, setProposta] = useState<PropostaAuto | null>(null);
  const [cotacoes, setCotacoes] = useState<AutoCotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pagamentoOpen, setPagamentoOpen] = useState(false);

  // Draft states
  const [draft, setDraft] = useState<AutoCotacao[]>([]);
  const [saving, setSaving] = useState(false);
  const [draftCorRotulos, setDraftCorRotulos] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      try {
        const { api } = await import('@/lib/api');
        const res = await api.fetch(`/propostas/auto/full/${slug}`);
        
        if (res.proposta) {
          setProposta(res.proposta);
          setCotacoes(res.seguradoras || []);
          setDraft(res.seguradoras || []);
          setDraftCorRotulos(res.proposta.cor_rotulos || null);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Error loading auto proposal:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
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

  const view = editMode ? draft : cotacoes;
  const corRotulosAtiva = editMode ? draftCorRotulos : proposta.cor_rotulos ?? null;
  const rotuloCol = getColunaColor(corRotulosAtiva);
  const algumaTemPagamento = view.some(
    (c) => parseFormasPagamento(c.formas_pagamento_detalhes).length > 0
  );

  const tel = (proposta.consultora_telefone || "").replace(/\D/g, "");
  const whatsappHref = tel
    ? `https://wa.me/${tel.length <= 11 ? "55" + tel : tel}?text=${encodeURIComponent(
        `Olá! Vi minha proposta de seguro auto e gostaria de mais informações.`
      )}`
    : "#";

  // --- Admin Logic ---
  const updateDraft = (id: string, field: keyof AutoCotacao, val: any) => {
    setDraft((ds) => ds.map((c) => (c.id === id ? { ...c, [field]: val } : c)));
  };

  const removeCotacao = (id: string) => {
    setDraft((ds) => ds.filter((c) => c.id !== id));
  };

  const addCotacao = () => {
    const nextOrdem = draft.length > 0 ? Math.max(...draft.map(d => d.ordem_exibicao || 0)) + 1 : 1;
    const nova: AutoCotacao = {
      id: `tmp-${Math.random().toString(36).slice(2)}`,
      proposta_id: proposta!.id,
      seguradora_nome: "Nova Seguradora",
      ordem_exibicao: nextOrdem,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;
    setDraft((ds) => [...ds, nova]);
  };

  const saveDraft = async () => {
    if (!proposta) return;
    setSaving(true);
    try {
      // Sync seguradoras
      await db.from("proposta_auto_seguradoras").delete().eq("proposta_id", proposta.id);
      if (draft.length > 0) {
        const rows = draft.map((c, i) => ({
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
          formas_pagamento_detalhes: c.formas_pagamento_detalhes,
          destaque_comercial: c.destaque_comercial,
          cor_coluna: c.cor_coluna,
          ordem_exibicao: i + 1,
        }));
        await db.from("proposta_auto_seguradoras").insert(rows);
      }
      // Update proposta (colors, status etc)
      await db.from("propostas_auto").update({ cor_rotulos: draftCorRotulos }).eq("id", proposta.id);

      // Refresh
      const { api } = await import("@/lib/api");
      const res = await api.fetch(`/propostas/auto/full/${slug}`);
      setProposta(res.proposta);
      setCotacoes(res.seguradoras || []);
      setDraft(res.seguradoras || []);
      setEditMode(false);
      toast({ title: "Alterações salvas!" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const cancelDraft = () => {
    setDraft(cotacoes);
    setDraftCorRotulos(proposta?.cor_rotulos || null);
    setEditMode(false);
  };

  const renderEditableCell = (c: AutoCotacao, crit: Criterio) => {
    const value = (c as any)[crit.field];
    if (crit.type === "number") {
      return (
        <Input
          value={value == null ? "" : String(value)}
          onChange={(e) => updateDraft(c.id, crit.field, parseNum(e.target.value))}
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

  const FormasPagamentoEditor = ({ c }: { c: AutoCotacao }) => {
    const list = parseFormasPagamento(c.formas_pagamento_detalhes);
    return (
      <div className="space-y-1 mt-1">
        {list.map((d, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <Input
              value={d.descricao}
              onChange={(e) => {
                const next = [...list];
                next[idx] = { ...next[idx], descricao: e.target.value };
                updateDraft(c.id, "formas_pagamento_detalhes", next);
              }}
              placeholder="Ex: 10x sem juros"
              className="h-7 text-[10px] px-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                const next = list.filter((_, k) => k !== idx);
                updateDraft(c.id, "formas_pagamento_detalhes", next.length ? next : null);
              }}
            >
              <Trash2 className="w-3 h-3 text-destructive" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] w-full"
          onClick={() => {
            const next = [...list, { tipo: "Cartão de crédito", descricao: "" }];
            updateDraft(c.id, "formas_pagamento_detalhes", next);
          }}
        >
          <Plus className="w-3 h-3 mr-1" /> Add opção
        </Button>
      </div>
    );
  };

  // Lista visual (read-only) das formas de pagamento de UMA seguradora
  const FormasPagamentoList = ({ c }: { c: AutoCotacao }) => {
    const lista = parseFormasPagamento(c.formas_pagamento_detalhes);
    if (lista.length === 0) {
      return <span className="text-muted-foreground text-xs"></span>;
    }
    return (
      <ul className="text-xs text-left space-y-1 bg-muted/40 rounded-md p-2 border border-border/60">
        {lista.map((d, i) => (
          <li key={i} className="flex flex-col">
            <span className="font-semibold text-foreground">{d.tipo || ""}</span>
            {d.descricao && (
              <span className="text-muted-foreground">{d.descricao}</span>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Admin Bar */}
      {isAdmin && (
        <div className="bg-muted border-b sticky top-0 z-50">
          <div className="container py-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-background">Modo Consultor</Badge>
              {editMode ? (
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={saveDraft} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <SaveIcon className="w-4 h-4 mr-2" />}
                    Salvar Alterações
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelDraft} disabled={saving}>
                    <X className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                  <Edit2 className="w-4 h-4 mr-2" /> Ativar Edição
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {editMode && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Palette className="w-4 h-4 mr-2" /> Cor Rótulos
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3">
                      <p className="text-xs font-semibold mb-2">Cor da coluna de rótulos</p>
                      <div className="grid grid-cols-5 gap-2">
                        <button
                          className={cn("h-8 rounded border", !draftCorRotulos && "ring-2 ring-primary")}
                          onClick={() => setDraftCorRotulos(null)}
                        >
                          <X className="w-4 h-4 mx-auto" />
                        </button>
                        {Object.entries(COLUNA_COLORS).map(([k, v]) => (
                          <button
                            key={k}
                            className={cn("h-8 rounded", v.header, draftCorRotulos === k && "ring-2 ring-primary")}
                            onClick={() => setDraftCorRotulos(k)}
                          >
                            {draftCorRotulos === k && <Check className="w-3 h-3 mx-auto" />}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button size="sm" variant="outline" onClick={addCotacao}>
                    <Plus className="w-4 h-4 mr-2" /> Add Seguradora
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => window.open(`/cotacao-auto/${slug}`, "_blank")}>
                <EyeIcon className="w-4 h-4 mr-2" /> Ver como Cliente
              </Button>
            </div>
          </div>
        </div>
      )}

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
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm opacity-90 pt-2">
            {proposta.veiculo_marca_modelo && (
              <span className="flex items-center gap-1">
                <Car className="w-4 h-4" /> {proposta.veiculo_marca_modelo}
              </span>
            )}
            {proposta.tipo_cotacao && (
              <span className="flex items-center gap-1">
                <RefreshCw className="w-4 h-4" />
                {{
                  novo: "Seguro novo",
                  renovacao_congenere: "Renovação congênere",
                  renovacao_mesma: "Renovação mesma seguradora",
                }[proposta.tipo_cotacao as string] || proposta.tipo_cotacao}
              </span>
            )}
            {(proposta.vigencia_inicio || proposta.vigencia_fim) && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Vigência{" "}
                {proposta.vigencia_inicio
                  ? format(new Date(proposta.vigencia_inicio), "dd/MM/yyyy", { locale: ptBR })
                  : "—"}
                {" → "}
                {proposta.vigencia_fim
                  ? format(new Date(proposta.vigencia_fim), "dd/MM/yyyy", { locale: ptBR })
                  : "—"}
              </span>
            )}
            {proposta.cep_pernoite && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" /> CEP pernoite {proposta.cep_pernoite}
              </span>
            )}
            {proposta.condutor_18_26 && (
              <span className="flex items-center gap-1">
                <UserCheck className="w-4 h-4" /> Condutor 18–26 anos
              </span>
            )}
            {proposta.validade_proposta && (
              <span className="flex items-center gap-1 opacity-80">
                <FileText className="w-4 h-4" /> Válida até{" "}
                {format(new Date(proposta.validade_proposta), "dd/MM/yyyy", {
                  locale: ptBR,
                })}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Barra de admin (removida) */}

          {cotacoes.length === 0 && !editMode ? (
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
                    <th
                      className={cn(
                        "text-left px-4 py-3 font-semibold w-48",
                        rotuloCol ? rotuloCol.header : "text-foreground"
                      )}
                    >
                      Seguradora
                    </th>
                    {view.map((c) => {
                      const colColor = getColunaColor(c.cor_coluna);
                      return (
                        <th
                          key={c.id}
                          className={cn(
                            "px-4 py-4 text-center align-bottom min-w-[220px]",
                            colColor ? colColor.header : "bg-muted/30"
                          )}
                        >
                          {editMode ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <Select
                                  value={c.destaque_comercial || "none"}
                                  onValueChange={(v) => updateDraft(c.id, "destaque_comercial", v === "none" ? null : v)}
                                >
                                  <SelectTrigger className="h-6 w-full text-[10px]">
                                    <SelectValue placeholder="Destaque" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sem destaque</SelectItem>
                                    {Object.entries(DESTAQUE_LABELS).map(([k, v]) => (
                                      <SelectItem key={k} value={k}>{v}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <Select
                                  value={c.cor_coluna || "none"}
                                  onValueChange={(v) => updateDraft(c.id, "cor_coluna", v === "none" ? null : v)}
                                >
                                  <SelectTrigger className="h-6 w-24 text-[10px]">
                                    <Palette className="w-3 h-3 mr-1" /> Cor
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Padrão</SelectItem>
                                    {Object.entries(COLUNA_COLORS).map(([k, v]) => (
                                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCotacao(c.id)}>
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              </div>
                              <Input
                                value={c.seguradora_nome ?? ""}
                                onChange={(e) => updateDraft(c.id, "seguradora_nome", e.target.value)}
                                placeholder="Nome"
                                className="h-8 text-center"
                              />
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {c.destaque_comercial && DESTAQUE_LABELS[c.destaque_comercial] && (
                                <Badge className={cn("mb-1", DESTAQUE_COLORS[c.destaque_comercial] || "bg-primary text-primary-foreground")}>
                                  {DESTAQUE_LABELS[c.destaque_comercial]}
                                </Badge>
                              )}
                              <p className="font-bold text-foreground">
                                {c.seguradora_nome}
                              </p>
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                    <tr className="bg-primary/5">
                      <th
                        className={cn(
                          "text-left px-4 py-3 font-semibold",
                          rotuloCol ? rotuloCol.header : "text-foreground"
                        )}
                      >
                        Prêmio total
                      </th>
                      {view.map((c) => {
                        const colColor = getColunaColor(c.cor_coluna);
                        return (
                          <th key={c.id} className={cn("px-4 py-3 text-center", colColor ? colColor.cell : "")}>
                            {editMode ? (
                              <div className="space-y-1">
                                <Input
                                  value={c.premio_total == null ? "" : String(c.premio_total)}
                                  onChange={(e) => updateDraft(c.id, "premio_total", parseNum(e.target.value))}
                                  placeholder="0,00"
                                  className="h-8 text-center font-bold text-primary"
                                />
                                <Input
                                  value={c.parcelamento ?? ""}
                                  onChange={(e) => updateDraft(c.id, "parcelamento", e.target.value || null)}
                                  placeholder="Parcelamento"
                                  className="h-7 text-[10px] text-center"
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
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {CRITERIOS.map((crit, i) => (
                      <tr
                        key={crit.label}
                        className={i % 2 ? "bg-muted/20" : ""}
                      >
                        <td
                          className={cn(
                            "px-4 py-3 font-medium",
                            rotuloCol
                              ? cn(rotuloCol.header, "border-b border-white/25")
                              : "text-foreground"
                          )}
                        >
                          {crit.label}
                        </td>
                        {view.map((c) => {
                          const colColor = getColunaColor(c.cor_coluna);
                          return (
                            <td
                              key={c.id}
                              className={cn(
                                "px-4 py-3 text-center text-muted-foreground",
                                colColor ? colColor.cell : ""
                              )}
                            >
                              {editMode ? renderEditableCell(c, crit) : crit.render(c)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {algumaTemPagamento && (
                      <tr className={CRITERIOS.length % 2 ? "bg-muted/20" : ""}>
                        <td
                          className={cn(
                            "px-4 py-3 font-medium align-top",
                            rotuloCol
                              ? cn(rotuloCol.header, "border-b border-white/25")
                              : "text-foreground"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setPagamentoOpen((v) => !v)}
                            className="inline-flex items-center gap-1.5 hover:underline"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Formas de pagamento</span>
                            <ChevronDown
                              className={cn(
                                "w-3.5 h-3.5 transition-transform",
                                pagamentoOpen && "rotate-180"
                              )}
                            />
                          </button>
                        </td>
                        {view.map((c) => {
                          const colColor = getColunaColor(c.cor_coluna);
                          return (
                            <td key={c.id} className={cn("px-4 py-3 text-center align-top", colColor ? colColor.cell : "")}>
                              {editMode ? (
                                <FormasPagamentoEditor c={c} />
                              ) : pagamentoOpen ? (
                                <FormasPagamentoList c={c} />
                              ) : (
                                <span className="text-muted-foreground/60 text-xs">
                                  {parseFormasPagamento(c.formas_pagamento_detalhes).length || "—"}
                                  {parseFormasPagamento(c.formas_pagamento_detalhes).length > 0 && " opções"}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
              </table>
            </div>
          </section>

          {/* Cards (mobile) */}
          <section className="container py-6 md:hidden space-y-4">
          {view.map((c) => {
              const destKey = c.destaque_comercial || "";
              const destLabel =
                DESTAQUE_LABELS[destKey] ||
                (destKey && !DESTAQUE_LABELS[destKey] ? destKey : null);
              const destClass =
                DESTAQUE_COLORS[destKey] ||
                "bg-primary text-primary-foreground";
              const colColor = getColunaColor(c.cor_coluna);
              
              return (
                <Card 
                  key={c.id} 
                  className={cn(
                    "overflow-hidden p-0 border-t-4", 
                    colColor ? colColor.border : "border-primary"
                  )}
                >
                  <div className={cn("p-4", colColor ? colColor.header : "bg-muted/30")}>
                    {editMode ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <Select
                            value={c.destaque_comercial || "none"}
                            onValueChange={(v) => updateDraft(c.id, "destaque_comercial", v === "none" ? null : v)}
                          >
                            <SelectTrigger className="h-7 w-full text-[10px]">
                              <SelectValue placeholder="Destaque" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem destaque</SelectItem>
                              {Object.entries(DESTAQUE_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCotacao(c.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                        <Input
                          value={c.seguradora_nome ?? ""}
                          onChange={(e) => updateDraft(c.id, "seguradora_nome", e.target.value)}
                          placeholder="Seguradora"
                          className="h-8"
                        />
                        <Input
                          value={c.produto_nome ?? ""}
                          onChange={(e) => updateDraft(c.id, "produto_nome", e.target.value || null)}
                          placeholder="Produto"
                          className="h-8"
                        />
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            {c.seguradora_nome}
                          </p>
                          <h3 className="font-bold text-foreground">
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
                    <div className={cn("rounded-lg p-3 text-center mb-4", colColor ? colColor.cell : "bg-primary/5")}>
                      <p className={cn("text-xs uppercase", colColor ? "text-current opacity-70" : "text-muted-foreground")}>
                        Prêmio total
                      </p>
                      {editMode ? (
                        <div className="space-y-1 mt-1">
                          <Input
                            value={c.premio_total == null ? "" : String(c.premio_total)}
                            onChange={(e) => updateDraft(c.id, "premio_total", parseNum(e.target.value))}
                            placeholder="0,00"
                            className="h-9 text-lg font-bold text-center text-primary bg-background"
                          />
                          <Input
                            value={c.parcelamento ?? ""}
                            onChange={(e) => updateDraft(c.id, "parcelamento", e.target.value || null)}
                            placeholder="Parcelamento"
                            className="h-7 text-xs text-center bg-background"
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
                      <div className="pt-2">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                          Formas de pagamento
                        </p>
                        {editMode ? (
                          <FormasPagamentoEditor c={c} />
                        ) : (
                          <FormasPagamentoList c={c} />
                        )}
                      </div>
                    </dl>
                  </div>
                </Card>
              );
            })}
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
