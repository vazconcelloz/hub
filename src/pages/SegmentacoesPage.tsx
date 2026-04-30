import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Target, Trash2, Pencil } from "lucide-react";

type Segmentacao = {
  id: string;
  nome: string;
  descricao: string | null;
  criterios: any;
  total_contatos: number;
  criado_por: string | null;
  updated_at: string;
};

export default function SegmentacoesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Segmentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Segmentacao | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "", criterios: "{}", total_contatos: 0 });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("segmentacoes").select("*").order("updated_at", { ascending: false });
    setItems((data as Segmentacao[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ nome: "", descricao: "", criterios: "{}", total_contatos: 0 }); setOpen(true); };
  const openEdit = (s: Segmentacao) => {
    setEditing(s);
    setForm({ nome: s.nome, descricao: s.descricao ?? "", criterios: JSON.stringify(s.criterios ?? {}, null, 2), total_contatos: s.total_contatos });
    setOpen(true);
  };

  const save = async () => {
    if (!form.nome.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    let criterios: any = {};
    try { criterios = JSON.parse(form.criterios || "{}"); } catch { toast({ title: "Critérios inválidos (JSON)", variant: "destructive" }); return; }
    const { data: userData } = await supabase.auth.getUser();
    const payload: any = { nome: form.nome.trim(), descricao: form.descricao || null, criterios, total_contatos: form.total_contatos };
    if (!editing) payload.criado_por = userData.user?.id;
    const { error } = editing
      ? await supabase.from("segmentacoes").update(payload).eq("id", editing.id)
      : await supabase.from("segmentacoes").insert(payload);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Atualizado" : "Criado" });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir segmentação?")) return;
    await supabase.from("segmentacoes").delete().eq("id", id);
    load();
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[hsl(var(--hub-text))]">Segmentações</h1>
          <p className="text-sm text-[hsl(var(--hub-text-muted))]">Listas e campanhas segmentadas de contatos.</p>
        </div>
        <Button onClick={openNew} className="bg-[hsl(var(--hub-primary))] hover:bg-[hsl(var(--hub-primary-hover))] text-[hsl(var(--hub-primary-foreground))]">
          <Plus className="w-4 h-4 mr-1" /> Nova segmentação
        </Button>
      </header>

      {loading ? (
        <p className="text-[hsl(var(--hub-text-muted))]">Carregando…</p>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-[hsl(var(--hub-border))] bg-[hsl(var(--hub-surface))]">
          <Target className="w-10 h-10 mx-auto text-[hsl(var(--hub-text-muted))] mb-3" />
          <p className="text-[hsl(var(--hub-text))] font-medium">Nenhuma segmentação ainda</p>
          <p className="text-sm text-[hsl(var(--hub-text-muted))] mb-4">Crie a primeira lista segmentada.</p>
          <Button onClick={openNew} variant="outline">Adicionar segmentação</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((s) => (
            <Card key={s.id} className="p-5 border-[hsl(var(--hub-border))] bg-[hsl(var(--hub-surface))]">
              <h3 className="font-semibold text-[hsl(var(--hub-text))]">{s.nome}</h3>
              {s.descricao && <p className="text-sm text-[hsl(var(--hub-text-muted))] mt-1 line-clamp-2">{s.descricao}</p>}
              <p className="text-xs text-[hsl(var(--hub-text-muted))] mt-3">{s.total_contatos} contatos</p>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => openEdit(s)}><Pencil className="w-3 h-3 mr-1" /> Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} segmentação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} /></div>
            <div><Label>Total de contatos</Label><Input type="number" value={form.total_contatos} onChange={(e) => setForm({ ...form, total_contatos: Number(e.target.value) })} /></div>
            <div>
              <Label>Critérios (JSON)</Label>
              <Textarea value={form.criterios} onChange={(e) => setForm({ ...form, criterios: e.target.value })} rows={5} className="font-mono text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-[hsl(var(--hub-primary))] text-[hsl(var(--hub-primary-foreground))]">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
