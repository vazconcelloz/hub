import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, BookOpen, Trash2, Download, Upload, Loader2 } from "lucide-react";

type Manual = {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string | null;
  arquivo_url: string;
  arquivo_nome: string | null;
  tamanho_bytes: number | null;
  updated_at: string;
};

export default function ManuaisPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Manual[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ titulo: "", descricao: "", categoria: "" });
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("manuais").select("*").order("updated_at", { ascending: false });
    setItems((data as Manual[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.titulo.trim() || !file) { toast({ title: "Título e arquivo são obrigatórios", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const path = `${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("manuais").upload(path, file);
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("manuais").createSignedUrl(path, 60 * 60 * 24 * 365);
      const arquivo_url = signed?.signedUrl ?? path;
      const { error } = await supabase.from("manuais").insert({
        titulo: form.titulo.trim(),
        descricao: form.descricao || null,
        categoria: form.categoria || null,
        arquivo_url,
        arquivo_nome: file.name,
        tamanho_bytes: file.size,
      });
      if (error) throw error;
      toast({ title: "Manual adicionado" });
      setOpen(false);
      setForm({ titulo: "", descricao: "", categoria: "" });
      setFile(null);
      load();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir manual?")) return;
    await supabase.from("manuais").delete().eq("id", id);
    load();
  };

  const formatBytes = (b: number | null) => {
    if (!b) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[hsl(var(--hub-text))]">Manuais</h1>
          <p className="text-sm text-[hsl(var(--hub-text-muted))]">Documentos e procedimentos da empresa.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-[hsl(var(--hub-primary))] hover:bg-[hsl(var(--hub-primary-hover))] text-[hsl(var(--hub-primary-foreground))]">
          <Plus className="w-4 h-4 mr-1" /> Novo manual
        </Button>
      </header>

      {loading ? (
        <p className="text-[hsl(var(--hub-text-muted))]">Carregando…</p>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-[hsl(var(--hub-border))] bg-[hsl(var(--hub-surface))]">
          <BookOpen className="w-10 h-10 mx-auto text-[hsl(var(--hub-text-muted))] mb-3" />
          <p className="text-[hsl(var(--hub-text))] font-medium">Nenhum manual ainda</p>
          <p className="text-sm text-[hsl(var(--hub-text-muted))] mb-4">Faça upload do primeiro documento.</p>
          <Button onClick={() => setOpen(true)} variant="outline">Adicionar manual</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((m) => (
            <Card key={m.id} className="p-5 border-[hsl(var(--hub-border))] bg-[hsl(var(--hub-surface))]">
              {m.categoria && <p className="text-xs uppercase tracking-wide text-[hsl(var(--hub-primary))] mb-1">{m.categoria}</p>}
              <h3 className="font-semibold text-[hsl(var(--hub-text))]">{m.titulo}</h3>
              {m.descricao && <p className="text-sm text-[hsl(var(--hub-text-muted))] mt-1 line-clamp-2">{m.descricao}</p>}
              <p className="text-xs text-[hsl(var(--hub-text-muted))] mt-2">{m.arquivo_nome} · {formatBytes(m.tamanho_bytes)}</p>
              <div className="flex gap-2 mt-4">
                <a href={m.arquivo_url} target="_blank" rel="noreferrer" className="flex-1">
                  <Button size="sm" variant="outline" className="w-full"><Download className="w-3 h-3 mr-1" /> Abrir</Button>
                </a>
                <Button size="sm" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo manual</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título *</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
            <div><Label>Categoria</Label><Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="RH, Comercial…" /></div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} /></div>
            <div>
              <Label>Arquivo *</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {file && <p className="text-xs text-[hsl(var(--hub-text-muted))] mt-1">{file.name}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={uploading} className="bg-[hsl(var(--hub-primary))] text-[hsl(var(--hub-primary-foreground))]">
              {uploading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Enviando…</> : <><Upload className="w-4 h-4 mr-1" /> Salvar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
