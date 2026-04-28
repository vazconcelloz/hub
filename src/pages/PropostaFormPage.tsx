import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { generateSlug, parseFaixasEtarias, parseIdades, calcularTotalPorFaixas, agruparPorOperadora } from "@/lib/proposal-utils";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, ArrowLeft, Plus, Trash2, Upload, GripVertical, Sparkles, Loader2, PencilLine } from "lucide-react";

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

interface OperadoraForm {
  id?: string;
  operadora_nome: string;
  plano_nome: string;
  valor_mensal: string;
  coparticipacao: string;
  acomodacao: string;
  abrangencia: string;
  reembolso: string;
  resumo_cobertura: string;
  rede_credenciada_resumo: string;
  destaque_comercial: string;
  ordem_exibicao: number;
  pdf_url: string;
  faixas_etarias: string;
  previsao_reajuste_faixa: string;
  cor_coluna: string;
  grupo_soma: string;
  pdf_file?: File;
}

const emptyOperadora: OperadoraForm = {
  operadora_nome: "", plano_nome: "", valor_mensal: "", coparticipacao: "",
  acomodacao: "", abrangencia: "", reembolso: "", resumo_cobertura: "",
  rede_credenciada_resumo: "", destaque_comercial: "", ordem_exibicao: 0, pdf_url: "",
  faixas_etarias: "", previsao_reajuste_faixa: "", cor_coluna: "", grupo_soma: "",
};

const limparNomePlano = (planoNome: string, operadoraNome: string) => {
  const plano = (planoNome || "").trim().replace(/\s+/g, " ");
  const operadora = (operadoraNome || "").trim();
  if (!plano || !operadora) return plano;
  const escaped = operadora.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return plano.replace(new RegExp(`^${escaped}\\s*[-–—:]?\\s*`, "i"), "").trim() || plano;
};

export default function PropostaFormPage() {
  const { id } = useParams();
  const isEdit = !!id && id !== "nova";
  const [searchParams] = useSearchParams();
  const modoManual = searchParams.get("modo") === "manual" && !isEdit;

  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nome_cliente: "", telefone_cliente: "", cidade: "", estado: "",
    tipo_produto: "", faixa_etaria_ou_perfil: "", consultora_nome: "",
    consultora_telefone: "", consultora_foto_url: "", validade_proposta: "",
    observacoes_gerais: "", status: "pendente", idades_beneficiarios: "",
  });

  const [operadoras, setOperadoras] = useState<OperadoraForm[]>([{ ...emptyOperadora, ordem_exibicao: 1 }]);
  const [consultorPhoto, setConsultorPhoto] = useState<File | null>(null);
  const [extractingIndex, setExtractingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isEdit) loadProposta();
  }, [id]);

  const loadProposta = async () => {
    const { data: proposta } = await supabase.from("propostas").select("*").eq("id", id!).single();
    if (!proposta) { navigate("/admin"); return; }
    setForm({
      nome_cliente: proposta.nome_cliente || "",
      telefone_cliente: proposta.telefone_cliente || "",
      cidade: proposta.cidade || "",
      estado: proposta.estado || "",
      tipo_produto: proposta.tipo_produto || "",
      faixa_etaria_ou_perfil: proposta.faixa_etaria_ou_perfil || "",
      consultora_nome: proposta.consultora_nome || "",
      consultora_telefone: proposta.consultora_telefone || "",
      consultora_foto_url: proposta.consultora_foto_url || "",
      validade_proposta: proposta.validade_proposta || "",
      observacoes_gerais: proposta.observacoes_gerais || "",
      status: proposta.status,
      idades_beneficiarios: (proposta as any).idades_beneficiarios || "",
    });

    const { data: ops } = await supabase
      .from("proposta_operadoras")
      .select("*")
      .eq("proposta_id", id!)
      .order("ordem_exibicao");

    if (ops && ops.length > 0) {
      setOperadoras(ops.map((op) => ({
        id: op.id,
        operadora_nome: op.operadora_nome,
        plano_nome: op.plano_nome || "",
        valor_mensal: op.valor_mensal?.toString() || "",
        coparticipacao: op.coparticipacao || "",
        acomodacao: op.acomodacao || "",
        abrangencia: op.abrangencia || "",
        reembolso: op.reembolso || "",
        resumo_cobertura: op.resumo_cobertura || "",
        rede_credenciada_resumo: op.rede_credenciada_resumo || "",
        destaque_comercial: op.destaque_comercial || "",
        ordem_exibicao: op.ordem_exibicao,
        pdf_url: op.pdf_url || "",
        faixas_etarias: (op as any).faixas_etarias || "",
        previsao_reajuste_faixa: (op as any).previsao_reajuste_faixa || "",
        cor_coluna: (op as any).cor_coluna || "",
        grupo_soma: (op as any).grupo_soma || "",
      })));
    }
  };

  const updateForm = (field: string, value: string) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);
    
    // Auto-recalculate valor_mensal when idades change
    if (field === "idades_beneficiarios") {
      recalcularValores(value, operadoras);
    }
  };

  const recalcularValores = (idadesText: string, ops: OperadoraForm[]) => {
    const idades = parseIdades(idadesText);
    if (idades.length === 0) return;
    const updated = ops.map((op) => {
      const faixas = parseFaixasEtarias(op.faixas_etarias);
      if (faixas.length === 0) return op;
      const { total } = calcularTotalPorFaixas(idades, faixas);
      return { ...op, valor_mensal: total.toFixed(2) };
    });
    setOperadoras(updated);
  };

  const updateOperadora = (index: number, field: string, value: string | number) => {
    const updated = [...operadoras];
    (updated[index] as any)[field] = value;
    
    // Recalculate if faixas_etarias changed
    if (field === "faixas_etarias" && form.idades_beneficiarios) {
      const idades = parseIdades(form.idades_beneficiarios);
      const faixas = parseFaixasEtarias(value as string);
      if (idades.length > 0 && faixas.length > 0) {
        const { total } = calcularTotalPorFaixas(idades, faixas);
        updated[index].valor_mensal = total.toFixed(2);
      }
    }
    
    setOperadoras(updated);
  };

  const addOperadora = () => {
    setOperadoras([...operadoras, { ...emptyOperadora, ordem_exibicao: operadoras.length + 1 }]);
  };

  const removeOperadora = (index: number) => {
    if (operadoras.length <= 1) return;
    setOperadoras(operadoras.filter((_, i) => i !== index));
  };

  const operadorasAgrupadas = agruparPorOperadora(
    operadoras.map((op, index) => ({ ...op, _index: index }))
  );

  const handlePdfUpload = async (index: number, file: File) => {
    const updated = [...operadoras];
    updated[index].pdf_file = file;
    setOperadoras(updated);

    // Auto-extract data from PDF
    setExtractingIndex(index);
    try {
      const base64 = await fileToBase64(file);
      const response = await supabase.functions.invoke("extract-pdf-data", {
        body: { pdf_base64: base64, cidade: form.cidade, estado: form.estado },
      });

      if (response.error) {
        const message = (response.data as { error?: string } | null)?.error || response.error.message;
        throw new Error(message);
      }
      
      const extracted = response.data?.data;
      if (extracted) {
        const sharedFields = {
          operadora_nome: extracted.operadora_nome || "",
          coparticipacao: extracted.coparticipacao || "",
          acomodacao: extracted.acomodacao || "",
          abrangencia: extracted.abrangencia || "",
          reembolso: extracted.reembolso || "",
          resumo_cobertura: extracted.resumo_cobertura || "",
          rede_credenciada_resumo: extracted.rede_credenciada_resumo || "",
          previsao_reajuste_faixa: extracted.previsao_reajuste_faixa || "",
        };

        const operadoraNome = extracted.operadora_nome || operadoras[index]?.operadora_nome || "";
        const planos = extracted.planos && Array.isArray(extracted.planos) && extracted.planos.length > 0
          ? extracted.planos
          : [{ plano_nome: extracted.plano_nome || "", faixas_etarias: extracted.faixas_etarias || "" }];

        const newOperadoras: OperadoraForm[] = [];
        // Keep operadoras before the current index
        for (let i = 0; i < index; i++) {
          newOperadoras.push(operadoras[i]);
        }

        // Create one operadora per extracted plan
        for (let p = 0; p < planos.length; p++) {
          const plano = planos[p];
          const op: OperadoraForm = {
            ...emptyOperadora,
            ...sharedFields,
            // Campos por-plano sobrescrevem os shared quando vierem preenchidos
            ...(plano.coparticipacao ? { coparticipacao: plano.coparticipacao } : {}),
            ...(plano.acomodacao ? { acomodacao: plano.acomodacao } : {}),
            ...(plano.abrangencia ? { abrangencia: plano.abrangencia } : {}),
            ...(plano.reembolso ? { reembolso: plano.reembolso } : {}),
            ...(plano.resumo_cobertura ? { resumo_cobertura: plano.resumo_cobertura } : {}),
            pdf_file: file,
            operadora_nome: operadoraNome,
            plano_nome: limparNomePlano(plano.plano_nome || "", operadoraNome),
            faixas_etarias: plano.faixas_etarias || "",
            ordem_exibicao: newOperadoras.length + 1,
          };

          // 1) Valor extraído diretamente pela IA (mensalidade única no PDF)
          if (typeof plano.valor_mensal === "number" && plano.valor_mensal > 0) {
            op.valor_mensal = plano.valor_mensal.toFixed(2);
          }

          // 2) Calcula pelo total das idades, se informadas
          if (!op.valor_mensal && form.idades_beneficiarios) {
            const idades = parseIdades(form.idades_beneficiarios);
            const faixas = parseFaixasEtarias(plano.faixas_etarias || "");
            if (idades.length > 0 && faixas.length > 0) {
              const { total } = calcularTotalPorFaixas(idades, faixas);
              if (total > 0) op.valor_mensal = total.toFixed(2);
            }
          }

          // 3) Fallback: usa o menor valor da tabela de faixas como referência
          if (!op.valor_mensal) {
            const faixas = parseFaixasEtarias(plano.faixas_etarias || "");
            if (faixas.length > 0) {
              const menor = Math.min(...faixas.map((f) => f.valor));
              if (menor > 0) op.valor_mensal = menor.toFixed(2);
            }
          }

          newOperadoras.push(op);
        }

        // Keep operadoras after the current index
        for (let i = index + 1; i < operadoras.length; i++) {
          newOperadoras.push({ ...operadoras[i], ordem_exibicao: newOperadoras.length + 1 });
        }

        setOperadoras(newOperadoras);

        // Preencher dados do cliente se campos estiverem vazios
        setForm(prev => ({
          ...prev,
          nome_cliente: prev.nome_cliente || extracted.cliente_nome || "",
          cidade: prev.cidade || extracted.cliente_cidade || "",
          estado: prev.estado || extracted.cliente_estado || "",
        }));

        const planoCount = planos.length;
        toast({ title: "Dados extraídos!", description: `${planoCount} plano${planoCount > 1 ? "s" : ""} extraído${planoCount > 1 ? "s" : ""} de ${extracted.operadora_nome || "a operadora"}. Revise antes de salvar.` });
      }
    } catch (err: any) {
      console.error("PDF extraction error:", err);
      toast({ title: "Extração automática falhou", description: err?.message || "Preencha os campos manualmente.", variant: "destructive" });
    } finally {
      setExtractingIndex(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleConsultorPhotoUpload = (file: File) => {
    setConsultorPhoto(file);
  };

  const uploadFile = async (file: File, bucket: string, folder: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let consultorPhotoUrl = form.consultora_foto_url;
      if (consultorPhoto) {
        consultorPhotoUrl = await uploadFile(consultorPhoto, "consultora-fotos", "photos");
      }

      let propostaId: string;

      if (isEdit) {
        const { error } = await supabase.from("propostas").update({
          ...form,
          consultora_foto_url: consultorPhotoUrl,
          validade_proposta: form.validade_proposta || null,
        } as any).eq("id", id!);
        if (error) throw error;
        propostaId = id!;

        // Delete existing operadoras and re-create
        await supabase.from("proposta_operadoras").delete().eq("proposta_id", id!);
      } else {
        const slug = generateSlug();
        const { data, error } = await supabase.from("propostas").insert({
          ...form,
          
          slug,
          consultora_foto_url: consultorPhotoUrl,
          validade_proposta: form.validade_proposta || null,
        } as any).select().single();
        if (error) throw error;
        propostaId = data.id;
      }

      // Upload PDFs and create operadoras
      for (let i = 0; i < operadoras.length; i++) {
        const op = operadoras[i];
        let pdfUrl = op.pdf_url;
        if (op.pdf_file) {
          pdfUrl = await uploadFile(op.pdf_file, "operadora-pdfs", propostaId);
        }

        await supabase.from("proposta_operadoras").insert({
          proposta_id: propostaId,
          operadora_nome: op.operadora_nome,
          plano_nome: op.plano_nome || null,
          valor_mensal: op.valor_mensal ? parseFloat(op.valor_mensal) : null,
          coparticipacao: op.coparticipacao || null,
          acomodacao: op.acomodacao || null,
          abrangencia: op.abrangencia || null,
          reembolso: op.reembolso || null,
          resumo_cobertura: op.resumo_cobertura || null,
          rede_credenciada_resumo: op.rede_credenciada_resumo || null,
          destaque_comercial: op.destaque_comercial || null,
          ordem_exibicao: i + 1,
          pdf_url: pdfUrl || null,
          faixas_etarias: op.faixas_etarias || null,
          previsao_reajuste_faixa: op.previsao_reajuste_faixa || null,
          cor_coluna: op.cor_coluna || null,
          grupo_soma: op.grupo_soma?.trim() || null,
        } as any);
      }

      toast({ title: isEdit ? "Proposta atualizada!" : "Proposta criada!" });
      navigate("/admin");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {isEdit ? "Editar Proposta" : modoManual ? "Nova Proposta (do zero)" : "Nova Proposta"}
          </h1>
        </div>

        {modoManual && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
            <PencilLine className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">Modo manual</p>
              <p className="text-muted-foreground">
                Preencha os dados manualmente e use <strong>"Adicionar Plano/Operadora"</strong> abaixo
                para criar quantas colunas comparativas quiser. O upload de PDF é opcional.
              </p>
            </div>
          </div>
        )}

        {/* Client info */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Dados do Cliente</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Cliente *</Label>
              <Input value={form.nome_cliente} onChange={(e) => updateForm("nome_cliente", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.telefone_cliente} onChange={(e) => updateForm("telefone_cliente", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => updateForm("cidade", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => updateForm("estado", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Produto</Label>
              <Input value={form.tipo_produto} onChange={(e) => updateForm("tipo_produto", e.target.value)} placeholder="Ex: Plano de Saúde, Seguro de Vida..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Idades dos Beneficiários</Label>
              <Input value={form.idades_beneficiarios} onChange={(e) => updateForm("idades_beneficiarios", e.target.value)} placeholder="Ex: 35, 28, 5, 62 (separadas por vírgula)" />
              <p className="text-xs text-muted-foreground">Informe as idades para calcular automaticamente o valor total por plano</p>
            </div>
          </CardContent>
        </Card>

        {/* Consultant */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Dados da Consultora</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Consultora</Label>
              <Input value={form.consultora_nome} onChange={(e) => updateForm("consultora_nome", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefone (WhatsApp)</Label>
              <Input value={form.consultora_telefone} onChange={(e) => updateForm("consultora_telefone", e.target.value)} placeholder="5511999999999" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Foto da Consultora</Label>
              <div className="flex items-center gap-3">
                {(form.consultora_foto_url || consultorPhoto) && (
                  <img src={consultorPhoto ? URL.createObjectURL(consultorPhoto) : form.consultora_foto_url} alt="Consultora" className="w-16 h-16 rounded-full object-cover border-2 border-border" />
                )}
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors text-sm">
                    <Upload className="w-4 h-4" />
                    Escolher foto
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleConsultorPhotoUpload(e.target.files[0])} />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proposal details */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Detalhes da Proposta</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Validade da Proposta</Label>
              <Input type="date" value={form.validade_proposta} onChange={(e) => updateForm("validade_proposta", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => updateForm("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="enviada">Enviada</SelectItem>
                  <SelectItem value="visualizada">Visualizada</SelectItem>
                  <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                  <SelectItem value="fechada">Fechada</SelectItem>
                  <SelectItem value="perdida">Perdida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Observações Gerais</Label>
              <Textarea value={form.observacoes_gerais} onChange={(e) => updateForm("observacoes_gerais", e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* Operadoras e planos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-bold">Operadoras e Planos</h2>
              <p className="text-sm text-muted-foreground">
                Cada plano vira uma coluna na proposta comparativa do cliente.
              </p>
            </div>
            <Button type="button" onClick={addOperadora} className="gap-2">
              <Plus className="w-4 h-4" /> Adicionar Coluna / Plano
            </Button>
          </div>

          {operadorasAgrupadas.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              {operadorasAgrupadas.map((grupo) => (
                <div key={grupo.nome} className="flex items-center justify-between gap-3 py-1">
                  <span className="font-medium text-foreground">{grupo.nome}</span>
                  <span>{grupo.planos.length} plano{grupo.planos.length > 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          )}

          {operadoras.map((op, index) => (
            <Card key={index} className={`relative ${extractingIndex === index ? "ring-2 ring-primary/50" : ""}`}>
              {extractingIndex === index && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                  <div className="flex items-center gap-3 text-primary font-medium">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    Extraindo dados do PDF...
                  </div>
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    Plano {index + 1}{op.operadora_nome ? ` · ${op.operadora_nome}` : ""}
                  </CardTitle>
                  {operadoras.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeOperadora(index)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Operadora *</Label>
                  <Input value={op.operadora_nome} onChange={(e) => updateOperadora(index, "operadora_nome", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Nome do Plano</Label>
                  <Input value={op.plano_nome} onChange={(e) => updateOperadora(index, "plano_nome", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Valor Mensal (R$)</Label>
                  <Input type="number" step="0.01" value={op.valor_mensal} onChange={(e) => updateOperadora(index, "valor_mensal", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Coparticipação</Label>
                  <Input value={op.coparticipacao} onChange={(e) => updateOperadora(index, "coparticipacao", e.target.value)} placeholder="Ex: Sim, 30% em consultas" />
                </div>
                <div className="space-y-2">
                  <Label>Acomodação</Label>
                  <Input value={op.acomodacao} onChange={(e) => updateOperadora(index, "acomodacao", e.target.value)} placeholder="Ex: Enfermaria, Apartamento" />
                </div>
                <div className="space-y-2">
                  <Label>Abrangência</Label>
                  <Input value={op.abrangencia} onChange={(e) => updateOperadora(index, "abrangencia", e.target.value)} placeholder="Ex: Nacional, Estadual" />
                </div>
                <div className="space-y-2">
                  <Label>Reembolso</Label>
                  <Input value={op.reembolso} onChange={(e) => updateOperadora(index, "reembolso", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Destaque Comercial</Label>
                  <Select value={op.destaque_comercial} onValueChange={(v) => updateOperadora(index, "destaque_comercial", v)}>
                    <SelectTrigger><SelectValue placeholder="Sem destaque" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem destaque</SelectItem>
                      <SelectItem value="economico">Mais Econômico</SelectItem>
                      <SelectItem value="completo">Mais Completo</SelectItem>
                      <SelectItem value="recomendado">Recomendado</SelectItem>
                      <SelectItem value="custo_beneficio">Melhor Custo-Benefício</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2 rounded-md border border-dashed border-amber-300 bg-amber-50/50 p-3">
                  <Label className="text-amber-900 font-semibold">Grupo de Soma (apenas admin)</Label>
                  <Input
                    value={op.grupo_soma}
                    onChange={(e) => updateOperadora(index, "grupo_soma", e.target.value)}
                    placeholder='Ex: "Sócios+Funcionários" — planos com o MESMO rótulo serão somados em um único card para o cliente'
                    className="bg-white"
                  />
                  <p className="text-[11px] text-amber-800 leading-snug">
                    Use o mesmo rótulo em 2 ou mais planos para que o cliente veja UM card consolidado com a soma das mensalidades.
                    Deixe vazio para exibir o plano isoladamente. <strong>O cliente nunca vê esse rótulo.</strong>
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Resumo de Cobertura</Label>
                  <Textarea value={op.resumo_cobertura} onChange={(e) => updateOperadora(index, "resumo_cobertura", e.target.value)} rows={2} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Rede Credenciada (Resumo)</Label>
                  <Textarea value={op.rede_credenciada_resumo} onChange={(e) => updateOperadora(index, "rede_credenciada_resumo", e.target.value)} rows={2} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Faixas Etárias</Label>
                  <Textarea value={op.faixas_etarias} onChange={(e) => updateOperadora(index, "faixas_etarias", e.target.value)} rows={2} placeholder="Ex: 0-18: R$250 | 19-23: R$310 | 24-28: R$380..." />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Previsão de Reajuste por Faixa</Label>
                  <Textarea value={op.previsao_reajuste_faixa} onChange={(e) => updateOperadora(index, "previsao_reajuste_faixa", e.target.value)} rows={2} placeholder="Ex: Reajuste médio de 15-20% entre faixas..." />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>PDF da Operadora</Label>
                  <div className="flex items-center gap-3">
                    {op.pdf_url && !op.pdf_file && (
                      <a href={op.pdf_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                        PDF atual ↗
                      </a>
                    )}
                    {op.pdf_file && <span className="text-sm text-muted-foreground">{op.pdf_file.name}</span>}
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors text-sm">
                        <Upload className="w-4 h-4" />
                        {op.pdf_url || op.pdf_file ? "Trocar PDF" : "Upload PDF"}
                      </div>
                      <input type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handlePdfUpload(index, e.target.files[0])} />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addOperadora}
            className="w-full border-dashed h-14 text-muted-foreground hover:text-foreground hover:border-primary"
          >
            <Plus className="w-4 h-4 mr-2" /> Adicionar outra coluna / plano
          </Button>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pb-8">
          <Button type="button" variant="outline" onClick={() => navigate("/admin")}>Cancelar</Button>
          <Button type="submit" size="lg" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : isEdit ? "Atualizar Proposta" : "Criar Proposta"}
          </Button>
        </div>
      </form>
    </AdminLayout>
  );
}
