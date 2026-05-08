import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, GraduationCap, Trash2, Pencil, ExternalLink } from "lucide-react";

type Treinamento = {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  conteudo: string | null;
  ordem: number;
  ativo: boolean;
};

const empty = { titulo: "", descricao: "", categoria: "", video_url: "", thumbnail_url: "", conteudo: "" };

export default function TreinamentosPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Treinamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Treinamento | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    const { data } = await db.from("treinamentos").select("*").order("ordem", { ascending: true }).order("created_at", { ascending: false });
    setItems((data as Treinamento[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (t: Treinamento) => {
    setEditing(t);
    setForm({ titulo: t.titulo, descricao: t.descricao ?? "", categoria: t.categoria ?? "", video_url: t.video_url ?? "", thumbnail_url: t.thumbnail_url ?? "", conteudo: t.conteudo ?? "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.titulo.trim()) { toast({ title: "Título obrigatório", variant: "destructive" }); return; }
    const payload = { ...form, titulo: form.titulo.trim() };
    const { error } = editing
      ? await db.from("treinamentos").update(payload).eq("id", editing.id)
      : await db.from("treinamentos").insert(payload);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Atualizado" : "Criado" });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir treinamento?")) return;
    await db.from("treinamentos").delete().eq("id", id);
    load();
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[hsl(var(--hub-text))]">Treinamentos</h1>
          <p className="text-sm text-[hsl(var(--hub-text-muted))]">Materiais e cursos para a equipe.</p>
        </div>
        <Button onClick={openNew} className="bg-[hsl(var(--hub-primary))] hover:bg-[hsl(var(--hub-primary-hover))] text-[hsl(var(--hub-primary-foreground))]">
          <Plus className="w-4 h-4 mr-1" /> Novo treinamento
        </Button>
      </header>

      {loading ? (
        <p className="text-[hsl(var(--hub-text-muted))]">Carregando…</p>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-[hsl(var(--hub-border))] bg-[hsl(var(--hub-surface))]">
          <GraduationCap className="w-10 h-10 mx-auto text-[hsl(var(--hub-text-muted))] mb-3" />
          <p className="text-[hsl(var(--hub-text))] font-medium">Nenhum treinamento ainda</p>
          <p className="text-sm text-[hsl(var(--hub-text-muted))] mb-4">Adicione o primeiro material para sua equipe.</p>
          <Button onClick={openNew} variant="outline">Adicionar treinamento</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => (
            <Card key={t.id} className="p-5 border-[hsl(var(--hub-border))] bg-[hsl(var(--hub-surface))] flex flex-col">
              {t.thumbnail_url && (
                <div className="aspect-video rounded-md overflow-hidden bg-[hsl(var(--hub-surface-muted))] mb-3">
                  <img src={t.thumbnail_url} alt={t.titulo} className="w-full h-full object-cover" />
                </div>
              )}
              {t.categoria && <p className="text-xs uppercase tracking-wide text-[hsl(var(--hub-primary))] mb-1">{t.categoria}</p>}
              <h3 className="font-semibold text-[hsl(var(--hub-text))]">{t.titulo}</h3>
              {t.descricao && <p className="text-sm text-[hsl(var(--hub-text-muted))] mt-1 line-clamp-2">{t.descricao}</p>}
              <div className="flex gap-2 mt-4">
                {t.video_url && (
                  <a href={t.video_url} target="_blank" rel="noreferrer" className="flex-1">
                    <Button size="sm" variant="outline" className="w-full"><ExternalLink className="w-3 h-3 mr-1" /> Abrir</Button>
                  </a>
                )}
                <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} treinamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título *</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
            <div><Label>Categoria</Label><Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Vendas, Operacional…" /></div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} /></div>
            <div><Label>Link do vídeo</Label><Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://…" /></div>
            <div><Label>Thumbnail (URL)</Label><Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://…" /></div>
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
