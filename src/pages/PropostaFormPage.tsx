import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { generateSlug } from "@/lib/proposal-utils";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, ArrowLeft, Plus, Trash2, Upload, GripVertical, Sparkles, Loader2 } from "lucide-react";

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
  pdf_file?: File;
}

const emptyOperadora: OperadoraForm = {
  operadora_nome: "", plano_nome: "", valor_mensal: "", coparticipacao: "",
  acomodacao: "", abrangencia: "", reembolso: "", resumo_cobertura: "",
  rede_credenciada_resumo: "", destaque_comercial: "", ordem_exibicao: 0, pdf_url: "",
  faixas_etarias: "", previsao_reajuste_faixa: "",
};

export default function PropostaFormPage() {
  const { id } = useParams();
  const isEdit = !!id && id !== "nova";
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nome_cliente: "", telefone_cliente: "", cidade: "", estado: "",
    tipo_produto: "", faixa_etaria_ou_perfil: "", consultora_nome: "",
    consultora_telefone: "", consultora_foto_url: "", validade_proposta: "",
    observacoes_gerais: "", status: "pendente",
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
      })));
    }
  };

  const updateForm = (field: string, value: string) => setForm({ ...form, [field]: value });

  const updateOperadora = (index: number, field: string, value: string | number) => {
    const updated = [...operadoras];
    (updated[index] as any)[field] = value;
    setOperadoras(updated);
  };

  const addOperadora = () => {
    setOperadoras([...operadoras, { ...emptyOperadora, ordem_exibicao: operadoras.length + 1 }]);
  };

  const removeOperadora = (index: number) => {
    if (operadoras.length <= 1) return;
    setOperadoras(operadoras.filter((_, i) => i !== index));
  };

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

      if (response.error) throw new Error(response.error.message);
      
      const extracted = response.data?.data;
      if (extracted) {
        const newOperadoras = [...operadoras];
        newOperadoras[index] = {
          ...newOperadoras[index],
          pdf_file: file,
          operadora_nome: extracted.operadora_nome || newOperadoras[index].operadora_nome,
          plano_nome: extracted.plano_nome || newOperadoras[index].plano_nome,
          valor_mensal: extracted.valor_mensal?.toString() || newOperadoras[index].valor_mensal,
          coparticipacao: extracted.coparticipacao || newOperadoras[index].coparticipacao,
          acomodacao: extracted.acomodacao || newOperadoras[index].acomodacao,
          abrangencia: extracted.abrangencia || newOperadoras[index].abrangencia,
          reembolso: extracted.reembolso || newOperadoras[index].reembolso,
          resumo_cobertura: extracted.resumo_cobertura || newOperadoras[index].resumo_cobertura,
          rede_credenciada_resumo: extracted.rede_credenciada_resumo || newOperadoras[index].rede_credenciada_resumo,
        };
        setOperadoras(newOperadoras);

        // Preencher dados do cliente se campos estiverem vazios
        setForm(prev => ({
          ...prev,
          nome_cliente: prev.nome_cliente || extracted.cliente_nome || "",
          cidade: prev.cidade || extracted.cliente_cidade || "",
          estado: prev.estado || extracted.cliente_estado || "",
        }));

        toast({ title: "Dados extraídos!", description: `Campos preenchidos automaticamente para ${extracted.operadora_nome || "a operadora"}. Revise antes de salvar.` });
      }
    } catch (err: any) {
      console.error("PDF extraction error:", err);
      toast({ title: "Extração automática falhou", description: "Preencha os campos manualmente.", variant: "destructive" });
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
    if (!user) return;
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
        }).eq("id", id!);
        if (error) throw error;
        propostaId = id!;

        // Delete existing operadoras and re-create
        await supabase.from("proposta_operadoras").delete().eq("proposta_id", id!);
      } else {
        const slug = generateSlug();
        const { data, error } = await supabase.from("propostas").insert({
          ...form,
          user_id: user.id,
          slug,
          consultora_foto_url: consultorPhotoUrl,
          validade_proposta: form.validade_proposta || null,
        }).select().single();
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
        });
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
          <h1 className="text-2xl font-bold">{isEdit ? "Editar Proposta" : "Nova Proposta"}</h1>
        </div>

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

        {/* Operadoras */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Operadoras</h2>
            <Button type="button" variant="outline" onClick={addOperadora}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar Operadora
            </Button>
          </div>

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
                    Operadora {index + 1}
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
                <div className="space-y-2 md:col-span-2">
                  <Label>Resumo de Cobertura</Label>
                  <Textarea value={op.resumo_cobertura} onChange={(e) => updateOperadora(index, "resumo_cobertura", e.target.value)} rows={2} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Rede Credenciada (Resumo)</Label>
                  <Textarea value={op.rede_credenciada_resumo} onChange={(e) => updateOperadora(index, "rede_credenciada_resumo", e.target.value)} rows={2} />
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
