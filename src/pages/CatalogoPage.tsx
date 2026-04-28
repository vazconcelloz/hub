import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Building2, MapPin, Receipt, Shield, ArrowLeft, Upload, Loader2, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";

type Operadora = { id: string; nome: string; slug: string; logo_url: string | null; ativo: boolean; observacoes: string | null };
type RedeItem = {
  id: string; operadora_id: string; nome: string; tipo: string;
  cep: string | null; endereco: string | null; bairro: string | null;
  cidade: string; estado: string; telefone: string | null;
  especialidades: string[] | null; planos_aplicaveis: string[] | null;
  coberturas_por_plano: Record<string, string> | null;
  ativo: boolean; destaque: boolean;
};
type Coparticipacao = {
  id: string; operadora_id: string; plano_nome: string | null; modalidade: string;
  itens: Array<{ item: string; valor: string }>; observacoes: string | null; ativo: boolean;
};

const TIPOS = ["hospital", "clinica", "laboratorio", "pronto_socorro", "outros"];

export default function CatalogoPage() {
  const { toast } = useToast();
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [rede, setRede] = useState<RedeItem[]>([]);
  const [copart, setCopart] = useState<Coparticipacao[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [opDialog, setOpDialog] = useState<Operadora | null>(null);
  const [opNew, setOpNew] = useState(false);
  const [redeDialog, setRedeDialog] = useState<RedeItem | null>(null);
  const [redeNew, setRedeNew] = useState(false);
  const [coDialog, setCoDialog] = useState<Coparticipacao | null>(null);
  const [coNew, setCoNew] = useState(false);

  // Importação
  const [importDialog, setImportDialog] = useState(false);
  const [importOperadoraId, setImportOperadoraId] = useState<string>("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ total: number; planos: string[] } | null>(null);

  // Filtros da rede
  const [redeBusca, setRedeBusca] = useState("");
  const [redeFiltroOperadora, setRedeFiltroOperadora] = useState<string>("todas");
  const [redeFiltroPlano, setRedeFiltroPlano] = useState<string>("todos");

  const loadAll = async () => {
    setLoading(true);
    const [op, rd, co] = await Promise.all([
      supabase.from("operadoras_catalogo").select("*").order("nome"),
      supabase.from("rede_credenciada_catalogo").select("*").order("nome"),
      supabase.from("coparticipacao_catalogo").select("*").order("created_at", { ascending: false }),
    ]);
    if (op.data) setOperadoras(op.data as Operadora[]);
    if (rd.data) setRede(rd.data as RedeItem[]);
    if (co.data) setCopart((co.data as any[]).map(c => ({ ...c, itens: Array.isArray(c.itens) ? c.itens : [] })));
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const operadoraNome = (id: string) => operadoras.find(o => o.id === id)?.nome ?? "—";

  // OPERADORA save/delete
  const saveOperadora = async (o: Partial<Operadora>) => {
    const slug = (o.slug || o.nome || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const payload = { nome: o.nome, slug, logo_url: o.logo_url || null, ativo: o.ativo ?? true, observacoes: o.observacoes || null };
    const { error } = opNew
      ? await supabase.from("operadoras_catalogo").insert(payload as any)
      : await supabase.from("operadoras_catalogo").update(payload).eq("id", o.id!);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: opNew ? "Operadora criada" : "Operadora atualizada" });
    setOpDialog(null); setOpNew(false); loadAll();
  };
  const delOperadora = async (id: string) => {
    if (!confirm("Excluir esta operadora? Itens vinculados podem quebrar.")) return;
    const { error } = await supabase.from("operadoras_catalogo").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    loadAll();
  };

  // REDE
  const saveRede = async (r: Partial<RedeItem>) => {
    const payload = {
      operadora_id: r.operadora_id, nome: r.nome, tipo: r.tipo || "hospital",
      cep: r.cep || null, endereco: r.endereco || null, bairro: r.bairro || null,
      cidade: r.cidade, estado: r.estado, telefone: r.telefone || null,
      especialidades: r.especialidades || [], planos_aplicaveis: r.planos_aplicaveis || [],
      ativo: r.ativo ?? true, destaque: r.destaque ?? false,
    };
    const { error } = redeNew
      ? await supabase.from("rede_credenciada_catalogo").insert(payload as any)
      : await supabase.from("rede_credenciada_catalogo").update(payload).eq("id", r.id!);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: redeNew ? "Item criado" : "Item atualizado" });
    setRedeDialog(null); setRedeNew(false); loadAll();
  };
  const delRede = async (id: string) => {
    if (!confirm("Excluir este item da rede?")) return;
    await supabase.from("rede_credenciada_catalogo").delete().eq("id", id);
    loadAll();
  };

  // COPART
  const saveCopart = async (c: Partial<Coparticipacao>) => {
    const payload = {
      operadora_id: c.operadora_id, plano_nome: c.plano_nome || null,
      modalidade: c.modalidade || "padrao", itens: c.itens || [],
      observacoes: c.observacoes || null, ativo: c.ativo ?? true,
    };
    const { error } = coNew
      ? await supabase.from("coparticipacao_catalogo").insert(payload as any)
      : await supabase.from("coparticipacao_catalogo").update(payload).eq("id", c.id!);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: coNew ? "Tabela criada" : "Tabela atualizada" });
    setCoDialog(null); setCoNew(false); loadAll();
  };
  const delCopart = async (id: string) => {
    if (!confirm("Excluir esta tabela?")) return;
    await supabase.from("coparticipacao_catalogo").delete().eq("id", id);
    loadAll();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-card sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 gradient-primary rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground hidden sm:inline">Catálogo</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Início</Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Catálogo Global</h1>
          <p className="text-muted-foreground">Operadoras, rede credenciada e tabelas de coparticipação reutilizáveis.</p>
        </div>

        <Tabs defaultValue="operadoras" className="w-full">
          <TabsList>
            <TabsTrigger value="operadoras"><Building2 className="w-4 h-4 mr-1" />Operadoras</TabsTrigger>
            <TabsTrigger value="rede"><MapPin className="w-4 h-4 mr-1" />Rede Credenciada</TabsTrigger>
            <TabsTrigger value="copart"><Receipt className="w-4 h-4 mr-1" />Coparticipação</TabsTrigger>
          </TabsList>

          {/* OPERADORAS */}
          <TabsContent value="operadoras">
            <Card>
              <CardHeader className="flex-row justify-between items-center">
                <CardTitle>Operadoras ({operadoras.length})</CardTitle>
                <Button onClick={() => { setOpNew(true); setOpDialog({ id: "", nome: "", slug: "", logo_url: null, ativo: true, observacoes: null }); }}>
                  <Plus className="w-4 h-4 mr-1" />Nova
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading && <p className="text-muted-foreground">Carregando...</p>}
                {operadoras.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      {o.logo_url && <img src={o.logo_url} alt={o.nome} className="w-10 h-10 object-contain" />}
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {o.nome}
                          {!o.ativo && <Badge variant="secondary">Inativa</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">{o.slug}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setOpNew(false); setOpDialog(o); }}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => delOperadora(o.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* REDE */}
          <TabsContent value="rede">
            <Card>
              <CardHeader className="flex-row justify-between items-center">
                <CardTitle>Rede Credenciada ({rede.length})</CardTitle>
                <Button onClick={() => {
                  setRedeNew(true);
                  setRedeDialog({ id: "", operadora_id: operadoras[0]?.id ?? "", nome: "", tipo: "hospital", cep: "", endereco: "", bairro: "", cidade: "", estado: "", telefone: "", especialidades: [], planos_aplicaveis: [], ativo: true, destaque: false });
                }}><Plus className="w-4 h-4 mr-1" />Novo</Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {rede.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {r.nome}
                        <Badge variant="outline">{r.tipo}</Badge>
                        {r.destaque && <Badge className="bg-accent text-accent-foreground">Destaque</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {operadoraNome(r.operadora_id)} · {r.cidade}/{r.estado} {r.bairro && `· ${r.bairro}`}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setRedeNew(false); setRedeDialog(r); }}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => delRede(r.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* COPART */}
          <TabsContent value="copart">
            <Card>
              <CardHeader className="flex-row justify-between items-center">
                <CardTitle>Coparticipação ({copart.length})</CardTitle>
                <Button onClick={() => {
                  setCoNew(true);
                  setCoDialog({ id: "", operadora_id: operadoras[0]?.id ?? "", plano_nome: "", modalidade: "padrao", itens: [], observacoes: null, ativo: true });
                }}><Plus className="w-4 h-4 mr-1" />Nova</Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {copart.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div>
                      <div className="font-medium">{operadoraNome(c.operadora_id)} {c.plano_nome && `· ${c.plano_nome}`}</div>
                      <div className="text-xs text-muted-foreground">{c.modalidade} · {c.itens.length} itens</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setCoNew(false); setCoDialog(c); }}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => delCopart(c.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* OPERADORA DIALOG */}
      <Dialog open={!!opDialog} onOpenChange={(o) => !o && (setOpDialog(null), setOpNew(false))}>
        <DialogContent>
          <DialogHeader><DialogTitle>{opNew ? "Nova operadora" : "Editar operadora"}</DialogTitle></DialogHeader>
          {opDialog && <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={opDialog.nome} onChange={e => setOpDialog({ ...opDialog, nome: e.target.value })} /></div>
            <div><Label>Slug</Label><Input value={opDialog.slug} placeholder="auto" onChange={e => setOpDialog({ ...opDialog, slug: e.target.value })} /></div>
            <div><Label>URL do logo</Label><Input value={opDialog.logo_url ?? ""} onChange={e => setOpDialog({ ...opDialog, logo_url: e.target.value })} /></div>
            <div><Label>Observações</Label><Textarea value={opDialog.observacoes ?? ""} onChange={e => setOpDialog({ ...opDialog, observacoes: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={opDialog.ativo} onCheckedChange={v => setOpDialog({ ...opDialog, ativo: v })} /><Label>Ativa</Label></div>
          </div>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setOpDialog(null); setOpNew(false); }}>Cancelar</Button>
            <Button onClick={() => opDialog && saveOperadora(opDialog)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REDE DIALOG */}
      <Dialog open={!!redeDialog} onOpenChange={(o) => !o && (setRedeDialog(null), setRedeNew(false))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{redeNew ? "Novo item da rede" : "Editar item"}</DialogTitle></DialogHeader>
          {redeDialog && <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Operadora *</Label>
              <Select value={redeDialog.operadora_id} onValueChange={v => setRedeDialog({ ...redeDialog, operadora_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{operadoras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Nome *</Label><Input value={redeDialog.nome} onChange={e => setRedeDialog({ ...redeDialog, nome: e.target.value })} /></div>
            <div><Label>Tipo</Label>
              <Select value={redeDialog.tipo} onValueChange={v => setRedeDialog({ ...redeDialog, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>CEP</Label><Input value={redeDialog.cep ?? ""} onChange={e => setRedeDialog({ ...redeDialog, cep: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={redeDialog.telefone ?? ""} onChange={e => setRedeDialog({ ...redeDialog, telefone: e.target.value })} /></div>
            <div className="col-span-2"><Label>Endereço</Label><Input value={redeDialog.endereco ?? ""} onChange={e => setRedeDialog({ ...redeDialog, endereco: e.target.value })} /></div>
            <div><Label>Bairro</Label><Input value={redeDialog.bairro ?? ""} onChange={e => setRedeDialog({ ...redeDialog, bairro: e.target.value })} /></div>
            <div><Label>Cidade *</Label><Input value={redeDialog.cidade} onChange={e => setRedeDialog({ ...redeDialog, cidade: e.target.value })} /></div>
            <div><Label>Estado (UF) *</Label><Input maxLength={2} value={redeDialog.estado} onChange={e => setRedeDialog({ ...redeDialog, estado: e.target.value.toUpperCase() })} /></div>
            <div className="col-span-2"><Label>Especialidades (separadas por vírgula)</Label>
              <Input value={(redeDialog.especialidades ?? []).join(", ")} onChange={e => setRedeDialog({ ...redeDialog, especialidades: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
            </div>
            <div className="col-span-2"><Label>Planos aplicáveis (vírgula; vazio = todos)</Label>
              <Input value={(redeDialog.planos_aplicaveis ?? []).join(", ")} onChange={e => setRedeDialog({ ...redeDialog, planos_aplicaveis: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
            </div>
            <div className="flex items-center gap-2"><Switch checked={redeDialog.ativo} onCheckedChange={v => setRedeDialog({ ...redeDialog, ativo: v })} /><Label>Ativo</Label></div>
            <div className="flex items-center gap-2"><Switch checked={redeDialog.destaque} onCheckedChange={v => setRedeDialog({ ...redeDialog, destaque: v })} /><Label>Destaque</Label></div>
          </div>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setRedeDialog(null); setRedeNew(false); }}>Cancelar</Button>
            <Button onClick={() => redeDialog && saveRede(redeDialog)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COPART DIALOG */}
      <Dialog open={!!coDialog} onOpenChange={(o) => !o && (setCoDialog(null), setCoNew(false))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{coNew ? "Nova tabela" : "Editar tabela"}</DialogTitle></DialogHeader>
          {coDialog && <div className="space-y-3">
            <div><Label>Operadora *</Label>
              <Select value={coDialog.operadora_id} onValueChange={v => setCoDialog({ ...coDialog, operadora_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{operadoras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Plano (opcional)</Label><Input value={coDialog.plano_nome ?? ""} onChange={e => setCoDialog({ ...coDialog, plano_nome: e.target.value })} /></div>
              <div><Label>Modalidade</Label><Input value={coDialog.modalidade} onChange={e => setCoDialog({ ...coDialog, modalidade: e.target.value })} /></div>
            </div>
            <div>
              <Label>Itens</Label>
              <div className="space-y-2 mt-2">
                {coDialog.itens.map((it, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder="Item (ex: Consulta)" value={it.item} onChange={e => {
                      const itens = [...coDialog.itens]; itens[i] = { ...itens[i], item: e.target.value };
                      setCoDialog({ ...coDialog, itens });
                    }} />
                    <Input placeholder="Valor (ex: 30%)" value={it.valor} onChange={e => {
                      const itens = [...coDialog.itens]; itens[i] = { ...itens[i], valor: e.target.value };
                      setCoDialog({ ...coDialog, itens });
                    }} />
                    <Button size="icon" variant="ghost" onClick={() => setCoDialog({ ...coDialog, itens: coDialog.itens.filter((_, j) => j !== i) })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setCoDialog({ ...coDialog, itens: [...coDialog.itens, { item: "", valor: "" }] })}>
                  <Plus className="w-4 h-4 mr-1" />Adicionar item
                </Button>
              </div>
            </div>
            <div><Label>Observações</Label><Textarea value={coDialog.observacoes ?? ""} onChange={e => setCoDialog({ ...coDialog, observacoes: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={coDialog.ativo} onCheckedChange={v => setCoDialog({ ...coDialog, ativo: v })} /><Label>Ativa</Label></div>
          </div>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setCoDialog(null); setCoNew(false); }}>Cancelar</Button>
            <Button onClick={() => coDialog && saveCopart(coDialog)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
