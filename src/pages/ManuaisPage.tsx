import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, BookOpen, Trash2, Download, Upload, Loader2, Eye, X } from "lucide-react";
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState("");
  const [selectedTitle, setSelectedTitle] = useState("");
  const [numPages, setNumPages] = useState<number>();


  const load = async () => {
    setLoading(true);
    const { data } = await db.from("manuais").select("*").order("updated_at", { ascending: false });
    setItems((data as Manual[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.titulo.trim() || !file) { toast({ title: "Título e arquivo são obrigatórios", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const path = `${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await db.storage.from("manuais").upload(path, file);
      if (upErr) throw upErr;
      const { data: signed } = await db.storage.from("manuais").createSignedUrl(path, 60 * 60 * 24 * 365);
      const arquivo_url = signed?.signedUrl ?? path;
      const { error } = await db.from("manuais").insert({
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
    await db.from("manuais").delete().eq("id", id);
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
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedUrl(m.arquivo_url);
                    setSelectedTitle(m.titulo);
                    setViewerOpen(true);
                  }}
                >
                  <Eye className="w-3 h-3 mr-1" /> Abrir
                </Button>

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

      {/* Visualizador de Manual */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-5xl w-full h-[85vh] p-0 overflow-hidden flex flex-col bg-[hsl(var(--hub-surface))] border border-[hsl(var(--hub-border))] rounded-xl shadow-2xl [&>button]:hidden">
          {/* Header customizado */}
          <div className="flex items-center justify-between p-4 bg-[hsl(var(--hub-surface))] border-b border-[hsl(var(--hub-border))] shrink-0">
            <DialogTitle className="text-lg font-semibold text-[hsl(var(--hub-text))] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[hsl(var(--hub-primary))]" />
              {selectedTitle}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open(selectedUrl, '_blank')}
                title="Baixar ou abrir em nova aba"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setViewerOpen(false)}
                className="text-[hsl(var(--hub-text-muted))] hover:text-foreground"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 w-full bg-muted/30 overflow-auto relative flex flex-col items-center py-8">
            <Document 
              file={selectedUrl} 
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={
                <div className="flex flex-col items-center justify-center text-[hsl(var(--hub-text-muted))] h-full">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-[hsl(var(--hub-primary))]" />
                  <p>Carregando documento...</p>
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center text-destructive h-full">
                  <p>Erro ao carregar o PDF.</p>
                </div>
              }
            >
              {Array.from(new Array(numPages), (el, index) => (
                <Page 
                  key={`page_${index + 1}`} 
                  pageNumber={index + 1} 
                  className="mb-8 shadow-xl"
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              ))}
            </Document>
          </div>
        </DialogContent>
      </Dialog>
    </div>

  );
}
