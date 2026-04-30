import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, ArrowLeft, Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { generateSlug, STATUS_LABELS } from "@/lib/proposal-auto-utils";
import { DESTAQUE_LABELS, COLUNA_COLORS } from "@/lib/proposal-utils";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface AutoCardForm {
  id?: string;
  seguradora_nome: string;
  produto_nome: string;
  premio_total: string;
  cobertura_resumo: string;
  franquia_valor: string;
  franquia_tipo: string;
  percentual_fipe: string;
  danos_materiais: string;
  danos_corporais: string;
  danos_morais: string;
  app_morte_invalidez: string;
  assistencia_24h: string;
  vidros: string;
  carro_reserva: string;
  parcelamento: string;
  formas_pagamento: string;
  destaque_comercial: string;
  cor_coluna: string;
  ordem_exibicao: number;
}

const empty: AutoCardForm = {
  seguradora_nome: "", produto_nome: "", premio_total: "", cobertura_resumo: "",
  franquia_valor: "", franquia_tipo: "", percentual_fipe: "",
  danos_materiais: "", danos_corporais: "", danos_morais: "",
  app_morte_invalidez: "", assistencia_24h: "", vidros: "", carro_reserva: "",
  parcelamento: "", formas_pagamento: "", destaque_comercial: "", cor_coluna: "", ordem_exibicao: 0,
};

const num = (s: string) => {
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

export default function PropostaAutoFormPage() {
  const { id } = useParams();
  const isEdit = !!id && id !== "nova";
  const [searchParams] = useSearchParams();
  const modoManual = searchParams.get("modo") === "manual" && !isEdit;

  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nome_cliente: "", telefone_cliente: "", veiculo_marca_modelo: "",
    consultora_nome: "", consultora_telefone: "", consultora_foto_url: "",
    validade_proposta: "", observacoes_gerais: "", status: "pendente",
  });
  const [cards, setCards] = useState<AutoCardForm[]>(modoManual ? [{ ...empty, ordem_exibicao: 1 }] : []);

  useEffect(() => {
    if (isEdit) load();
  }, [id]);

  const load = async () => {
    const { data: p } = await supabase.from("propostas_auto").select("*").eq("id", id!).single();
    if (!p) { navigate("/app/cotacoes/automovel"); return; }
    setForm({
      nome_cliente: p.nome_cliente || "",
      telefone_cliente: p.telefone_cliente || "",
      veiculo_marca_modelo: p.veiculo_marca_modelo || "",
      consultora_nome: p.consultora_nome || "",
      consultora_telefone: p.consultora_telefone || "",
      consultora_foto_url: p.consultora_foto_url || "",
      validade_proposta: p.validade_proposta || "",
      observacoes_gerais: p.observacoes_gerais || "",
      status: p.status,
    });
    const { data: cs } = await supabase
      .from("proposta_auto_seguradoras")
      .select("*")
      .eq("proposta_id", id!)
      .order("ordem_exibicao");
    if (cs) {
      setCards(cs.map((c) => ({
        id: c.id,
        seguradora_nome: c.seguradora_nome,
        produto_nome: c.produto_nome || "",
        premio_total: c.premio_total?.toString() || "",
        cobertura_resumo: c.cobertura_resumo || "",
        franquia_valor: c.franquia_valor?.toString() || "",
        franquia_tipo: c.franquia_tipo || "",
        percentual_fipe: c.percentual_fipe || "",
        danos_materiais: c.danos_materiais?.toString() || "",
        danos_corporais: c.danos_corporais?.toString() || "",
        danos_morais: c.danos_morais?.toString() || "",
        app_morte_invalidez: c.app_morte_invalidez?.toString() || "",
        assistencia_24h: c.assistencia_24h || "",
        vidros: c.vidros || "",
        carro_reserva: c.carro_reserva || "",
        parcelamento: c.parcelamento || "",
        formas_pagamento: c.formas_pagamento || "",
        destaque_comercial: c.destaque_comercial || "",
        cor_coluna: (c as any).cor_coluna || "",
        ordem_exibicao: c.ordem_exibicao,
      })));
    }
  };

  const handlePdf = async (file: File) => {
    setExtracting(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve((r.result as string).split(",")[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("extract-auto-pdf", {
        body: { pdf_base64: base64 },
      });
      if (error) throw error;
      const ext = data?.data;
      if (!ext) throw new Error("Nenhum dado extraído");

      setForm((f) => ({
        ...f,
        nome_cliente: f.nome_cliente || ext.cliente_nome || "",
        veiculo_marca_modelo: f.veiculo_marca_modelo || ext.veiculo_marca_modelo || "",
      }));

      const novos: AutoCardForm[] = (ext.cotacoes || []).map((c: any, i: number) => ({
        ...empty,
        seguradora_nome: c.seguradora_nome || "",
        produto_nome: c.produto_nome || "",
        premio_total: c.premio_total?.toString() || "",
        cobertura_resumo: c.cobertura_resumo || "",
        franquia_valor: c.franquia_valor?.toString() || "",
        franquia_tipo: c.franquia_tipo || "",
        percentual_fipe: c.percentual_fipe || "",
        danos_materiais: c.danos_materiais?.toString() || "",
        danos_corporais: c.danos_corporais?.toString() || "",
        danos_morais: c.danos_morais?.toString() || "",
        app_morte_invalidez: c.app_morte_invalidez?.toString() || "",
        assistencia_24h: c.assistencia_24h || "",
        vidros: c.vidros || "",
        carro_reserva: c.carro_reserva || "",
        parcelamento: c.parcelamento || "",
        formas_pagamento: c.formas_pagamento || "",
        destaque_comercial: "",
        ordem_exibicao: i + 1,
      }));
      setCards((prev) => [...prev, ...novos]);
      toast({ title: "PDF extraído!", description: `${novos.length} cotação(ões) adicionada(s).` });
    } catch (e: any) {
      toast({ title: "Erro ao extrair PDF", description: e.message, variant: "destructive" });
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const updateCard = (i: number, patch: Partial<AutoCardForm>) => {
    setCards((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  };

  const removeCard = (i: number) => setCards((cs) => cs.filter((_, idx) => idx !== i));
  const addCard = () => setCards((cs) => [...cs, { ...empty, ordem_exibicao: cs.length + 1 }]);

  const save = async () => {
    if (!form.nome_cliente.trim()) {
      toast({ title: "Informe o nome do cliente", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        ...form,
        validade_proposta: form.validade_proposta || null,
        user_id: user?.id,
      };

      let propostaId = id;
      if (isEdit) {
        const { error } = await supabase.from("propostas_auto").update(payload).eq("id", id!);
        if (error) throw error;
      } else {
        const { data: nova, error } = await supabase
          .from("propostas_auto")
          .insert({ ...payload, slug: generateSlug() })
          .select()
          .single();
        if (error) throw error;
        propostaId = nova.id;
      }

      // sync cards: deleta existentes e re-insere
      if (isEdit) await supabase.from("proposta_auto_seguradoras").delete().eq("proposta_id", propostaId!);

      if (cards.length) {
        const rows = cards.map((c, i) => ({
          proposta_id: propostaId!,
          seguradora_nome: c.seguradora_nome,
          produto_nome: c.produto_nome || null,
          premio_total: num(c.premio_total),
          cobertura_resumo: c.cobertura_resumo || null,
          franquia_valor: num(c.franquia_valor),
          franquia_tipo: c.franquia_tipo || null,
          percentual_fipe: c.percentual_fipe || null,
          danos_materiais: num(c.danos_materiais),
          danos_corporais: num(c.danos_corporais),
          danos_morais: num(c.danos_morais),
          app_morte_invalidez: num(c.app_morte_invalidez),
          assistencia_24h: c.assistencia_24h || null,
          vidros: c.vidros || null,
          carro_reserva: c.carro_reserva || null,
          parcelamento: c.parcelamento || null,
          formas_pagamento: c.formas_pagamento || null,
          destaque_comercial: c.destaque_comercial || null,
          ordem_exibicao: i + 1,
        }));
        const { error } = await supabase.from("proposta_auto_seguradoras").insert(rows);
        if (error) throw error;
      }

      toast({ title: "Proposta salva!" });
      navigate("/app/cotacoes/automovel");
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate("/app/cotacoes/automovel")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">
            {isEdit ? "Editar proposta" : "Nova proposta de auto"}
          </h1>
        </div>

        {!isEdit && !modoManual && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Importar PDF de cotação</CardTitle></CardHeader>
            <CardContent>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePdf(e.target.files[0])}
              />
              <Button onClick={() => fileRef.current?.click()} disabled={extracting} size="lg">
                {extracting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {extracting ? "Extraindo dados..." : "Selecionar PDF"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                A IA vai extrair automaticamente as cotações de cada seguradora.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-lg">Dados do cliente</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Nome do cliente *</Label>
              <Input value={form.nome_cliente} onChange={(e) => setForm({ ...form, nome_cliente: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone_cliente} onChange={(e) => setForm({ ...form, telefone_cliente: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Veículo (marca/modelo)</Label>
              <Input value={form.veiculo_marca_modelo} onChange={(e) => setForm({ ...form, veiculo_marca_modelo: e.target.value })} placeholder="ex: BYD/Dolphin Mini" />
            </div>
            <div>
              <Label>Validade</Label>
              <Input type="date" value={form.validade_proposta} onChange={(e) => setForm({ ...form, validade_proposta: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Consultor(a)</Label>
              <Input value={form.consultora_nome} onChange={(e) => setForm({ ...form, consultora_nome: e.target.value })} />
            </div>
            <div>
              <Label>Telefone consultor(a) (WhatsApp)</Label>
              <Input value={form.consultora_telefone} onChange={(e) => setForm({ ...form, consultora_telefone: e.target.value })} placeholder="11999999999" />
            </div>
            <div className="sm:col-span-2">
              <Label>Observações</Label>
              <Textarea rows={3} value={form.observacoes_gerais} onChange={(e) => setForm({ ...form, observacoes_gerais: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Cotações ({cards.length})</h2>
          <Button onClick={addCard} variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
        </div>

        {cards.map((c, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                {c.seguradora_nome || "Nova cotação"} {c.produto_nome ? `— ${c.produto_nome}` : ""}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => removeCard(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3">
              <div><Label>Seguradora *</Label><Input value={c.seguradora_nome} onChange={(e) => updateCard(i, { seguradora_nome: e.target.value })} /></div>
              <div><Label>Produto / Plano</Label><Input value={c.produto_nome} onChange={(e) => updateCard(i, { produto_nome: e.target.value })} /></div>
              <div><Label>Prêmio total (R$)</Label><Input value={c.premio_total} onChange={(e) => updateCard(i, { premio_total: e.target.value })} placeholder="4154.35" /></div>
              <div><Label>Parcelamento</Label><Input value={c.parcelamento} onChange={(e) => updateCard(i, { parcelamento: e.target.value })} placeholder="10x de R$ 415,39" /></div>
              <div className="sm:col-span-2"><Label>Cobertura (resumo)</Label><Input value={c.cobertura_resumo} onChange={(e) => updateCard(i, { cobertura_resumo: e.target.value })} placeholder="Colisão, Incêndio, Roubo e Furto" /></div>
              <div><Label>Franquia (R$)</Label><Input value={c.franquia_valor} onChange={(e) => updateCard(i, { franquia_valor: e.target.value })} /></div>
              <div><Label>Tipo de franquia</Label><Input value={c.franquia_tipo} onChange={(e) => updateCard(i, { franquia_tipo: e.target.value })} placeholder="Reduzida (50%)" /></div>
              <div><Label>% FIPE</Label><Input value={c.percentual_fipe} onChange={(e) => updateCard(i, { percentual_fipe: e.target.value })} placeholder="100%" /></div>
              <div><Label>APP Morte/Invalidez (R$)</Label><Input value={c.app_morte_invalidez} onChange={(e) => updateCard(i, { app_morte_invalidez: e.target.value })} /></div>
              <div><Label>Danos materiais (R$)</Label><Input value={c.danos_materiais} onChange={(e) => updateCard(i, { danos_materiais: e.target.value })} /></div>
              <div><Label>Danos corporais (R$)</Label><Input value={c.danos_corporais} onChange={(e) => updateCard(i, { danos_corporais: e.target.value })} /></div>
              <div><Label>Danos morais (R$)</Label><Input value={c.danos_morais} onChange={(e) => updateCard(i, { danos_morais: e.target.value })} /></div>
              <div><Label>Assistência 24h</Label><Input value={c.assistencia_24h} onChange={(e) => updateCard(i, { assistencia_24h: e.target.value })} placeholder="Reboque 500 km" /></div>
              <div><Label>Vidros</Label><Input value={c.vidros} onChange={(e) => updateCard(i, { vidros: e.target.value })} placeholder="Não contemplado" /></div>
              <div><Label>Carro reserva</Label><Input value={c.carro_reserva} onChange={(e) => updateCard(i, { carro_reserva: e.target.value })} /></div>
              <div><Label>Formas de pagamento</Label><Input value={c.formas_pagamento} onChange={(e) => updateCard(i, { formas_pagamento: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Destaque comercial</Label><Input value={c.destaque_comercial} onChange={(e) => updateCard(i, { destaque_comercial: e.target.value })} placeholder="Ex.: Mais Completo" /></div>
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-end gap-2 sticky bottom-4 bg-background/80 backdrop-blur p-3 rounded-lg border">
          <Button type="button" variant="outline" onClick={() => navigate("/app/cotacoes/automovel")}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar proposta
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
