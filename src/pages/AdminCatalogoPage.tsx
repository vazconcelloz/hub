import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Building2, MapPin, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type Operadora = {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
  observacoes: string | null;
  ativo: boolean;
};

type RedeItem = {
  id: string;
  operadora_id: string;
  nome: string;
  tipo: string;
  especialidades: string[] | null;
  cep: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string;
  estado: string;
  telefone: string | null;
  planos_aplicaveis: string[] | null;
  destaque: boolean;
  ativo: boolean;
};

type Coparticipacao = {
  id: string;
  operadora_id: string;
  plano_nome: string | null;
  modalidade: string;
  itens: Array<{ item: string; valor: string }>;
  observacoes: string | null;
  ativo: boolean;
};

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AdminCatalogoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [rede, setRede] = useState<RedeItem[]>([]);
  const [copart, setCopart] = useState<Coparticipacao[]>([]);
  const [search, setSearch] = useState("");
  const [filterOperadora, setFilterOperadora] = useState<string>("all");

  // dialogs
  const [opDialog, setOpDialog] = useState<{ open: boolean; item: Partial<Operadora> | null }>({ open: false, item: null });
  const [redeDialog, setRedeDialog] = useState<{ open: boolean; item: Partial<RedeItem> | null }>({ open: false, item: null });
  const [coDialog, setCoDialog] = useState<{ open: boolean; item: Partial<Coparticipacao> | null }>({ open: false, item: null });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
      if (data) loadAll();
    })();
  }, [user]);

  const loadAll = async () => {
    const [op, rd, cp] = await Promise.all([
      supabase.from("operadoras_catalogo").select("*").order("nome"),
      supabase.from("rede_credenciada_catalogo").select("*").order("nome"),
      supabase.from("coparticipacao_catalogo").select("*").order("created_at", { ascending: false }),
    ]);
    if (op.data) setOperadoras(op.data as Operadora[]);
    if (rd.data) setRede(rd.data as RedeItem[]);
    if (cp.data) setCopart(cp.data as any);
  };

  if (isAdmin === null) {
    return <AdminLayout><div className="text-center py-12 text-muted-foreground">Carregando...</div></AdminLayout>;
  }
  if (!isAdmin) {
    return (
      <AdminLayout>
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Acesso restrito</h2>
          <p className="text-muted-foreground mb-4">Esta área é apenas para administradores.</p>
          <Button onClick={() => navigate("/admin")}>Voltar ao Dashboard</Button>
        </Card>
      </AdminLayout>
    );
  }

  // ---------- Operadoras ----------
  const saveOperadora = async () => {
    const it = opDialog.item!;
    if (!it.nome) return toast({ title: "Nome é obrigatório", variant: "destructive" });
    const payload = {
      nome: it.nome,
      slug: it.slug || slugify(it.nome),
      logo_url: it.logo_url || null,
      observacoes: it.observacoes || null,
      ativo: it.ativo ?? true,
    };
    const { error } = it.id
      ? await supabase.from("operadoras_catalogo").update(payload).eq("id", it.id)
      : await supabase.from("operadoras_catalogo").insert(payload);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Salvo!" });
    setOpDialog({ open: false, item: null });
    loadAll();
  };

  const deleteOperadora = async (id: string) => {
    if (!confirm("Excluir esta operadora? Rede e coparticipações vinculadas continuarão existindo, mas ficarão órfãs.")) return;
    const { error } = await supabase.from("operadoras_catalogo").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    loadAll();
  };

  // ---------- Rede ----------
  const saveRede = async () => {
    const it = redeDialog.item!;
    if (!it.nome || !it.operadora_id || !it.tipo || !it.cidade || !it.estado)
      return toast({ title: "Preencha nome, operadora, tipo, cidade e estado", variant: "destructive" });
    const payload = {
      operadora_id: it.operadora_id,
      nome: it.nome,
      tipo: it.tipo,
      especialidades: it.especialidades || [],
      cep: it.cep || null,
      endereco: it.endereco || null,
      bairro: it.bairro || null,
      cidade: it.cidade,
      estado: it.estado,
      telefone: it.telefone || null,
      planos_aplicaveis: it.planos_aplicaveis || [],
      destaque: it.destaque ?? false,
      ativo: it.ativo ?? true,
    };
    const { error } = it.id
      ? await supabase.from("rede_credenciada_catalogo").update(payload).eq("id", it.id)
      : await supabase.from("rede_credenciada_catalogo").insert(payload);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Salvo!" });
    setRedeDialog({ open: false, item: null });
    loadAll();
  };

  const deleteRede = async (id: string) => {
    if (!confirm("Excluir este item da rede?")) return;
    const { error } = await supabase.from("rede_credenciada_catalogo").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    loadAll();
  };

  // ---------- Coparticipação ----------
  const saveCopart = async () => {
    const it = coDialog.item!;
    if (!it.operadora_id) return toast({ title: "Selecione a operadora", variant: "destructive" });
    const payload = {
      operadora_id: it.operadora_id,
      plano_nome: it.plano_nome || null,
      modalidade: it.modalidade || "padrao",
      itens: it.itens || [],
      observacoes: it.observacoes || null,
      ativo: it.ativo ?? true,
    };
    const { error } = it.id
      ? await supabase.from("coparticipacao_catalogo").update(payload).eq("id", it.id)
      : await supabase.from("coparticipacao_catalogo").insert(payload);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Salvo!" });
    setCoDialog({ open: false, item: null });
    loadAll();
  };

  const deleteCopart = async (id: string) => {
    if (!confirm("Excluir esta tabela de coparticipação?")) return;
    const { error } = await supabase.from("coparticipacao_catalogo").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    loadAll();
  };

  const opName = (id: string) => operadoras.find((o) => o.id === id)?.nome || "—";

  const filteredRede = rede.filter(
    (r) =>
      (filterOperadora === "all" || r.operadora_id === filterOperadora) &&
      (search === "" || r.nome.toLowerCase().includes(search.toLowerCase()) || r.cidade.toLowerCase().includes(search.toLowerCase())),
  );
  const filteredCopart = copart.filter((c) => filterOperadora === "all" || c.operadora_id === filterOperadora);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Catálogo Global</h1>
        <p className="text-muted-foreground">Cadastre operadoras, rede credenciada e tabelas de coparticipação reutilizáveis em todas as propostas.</p>
      </div>

      <Tabs defaultValue="operadoras">
        <TabsList>
          <TabsTrigger value="operadoras"><Building2 className="w-4 h-4 mr-1" /> Operadoras</TabsTrigger>
          <TabsTrigger value="rede"><MapPin className="w-4 h-4 mr-1" /> Rede Credenciada</TabsTrigger>
          <TabsTrigger value="copart"><Receipt className="w-4 h-4 mr-1" /> Coparticipação</TabsTrigger>
        </TabsList>

        {/* ===== OPERADORAS ===== */}
        <TabsContent value="operadoras" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{operadoras.length} operadora(s)</p>
            <Button onClick={() => setOpDialog({ open: true, item: { ativo: true } })}>
              <Plus className="w-4 h-4 mr-1" /> Nova Operadora
            </Button>
          </div>
          <div className="grid gap-3">
            {operadoras.map((o) => (
              <Card key={o.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {o.logo_url ? (
                    <img src={o.logo_url} alt={o.nome} className="w-12 h-12 object-contain rounded bg-muted" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {o.nome}
                      {!o.ativo && <Badge variant="secondary">inativo</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{o.slug}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setOpDialog({ open: true, item: o })}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteOperadora(o.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </Card>
            ))}
            {operadoras.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma operadora cadastrada.</p>}
          </div>
        </TabsContent>

        {/* ===== REDE ===== */}
        <TabsContent value="rede" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Buscar nome ou cidade..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={filterOperadora} onValueChange={setFilterOperadora}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas operadoras</SelectItem>
                  {operadoras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setRedeDialog({ open: true, item: { ativo: true, tipo: "hospital" } })}>
              <Plus className="w-4 h-4 mr-1" /> Novo Item
            </Button>
          </div>
          <div className="grid gap-2">
            {filteredRede.map((r) => (
              <Card key={r.id} className="p-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {r.nome}
                    <Badge variant="outline">{r.tipo}</Badge>
                    {r.destaque && <Badge>destaque</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {opName(r.operadora_id)} · {r.cidade}/{r.estado}
                    {r.bairro && ` · ${r.bairro}`}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setRedeDialog({ open: true, item: r })}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteRede(r.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </Card>
            ))}
            {filteredRede.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum item na rede.</p>}
          </div>
        </TabsContent>

        {/* ===== COPARTICIPAÇÃO ===== */}
        <TabsContent value="copart" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <Select value={filterOperadora} onValueChange={setFilterOperadora}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas operadoras</SelectItem>
                {operadoras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => setCoDialog({ open: true, item: { ativo: true, modalidade: "padrao", itens: [] } })}>
              <Plus className="w-4 h-4 mr-1" /> Nova Tabela
            </Button>
          </div>
          <div className="grid gap-3">
            {filteredCopart.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold">{opName(c.operadora_id)} {c.plano_nome && `· ${c.plano_nome}`}</div>
                    <Badge variant="outline" className="mt-1">{c.modalidade}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setCoDialog({ open: true, item: c })}><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteCopart(c.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                {c.itens && c.itens.length > 0 && (
                  <div className="text-sm space-y-1 border-t pt-2">
                    {c.itens.map((i, idx) => (
                      <div key={idx} className="flex justify-between"><span>{i.item}</span><span className="font-medium">{i.valor}</span></div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
            {filteredCopart.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma tabela cadastrada.</p>}
          </div>
        </TabsContent>
      </Tabs>

      {/* ===== Dialog Operadora ===== */}
      <Dialog open={opDialog.open} onOpenChange={(o) => !o && setOpDialog({ open: false, item: null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{opDialog.item?.id ? "Editar" : "Nova"} Operadora</DialogTitle></DialogHeader>
          {opDialog.item && (
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={opDialog.item.nome || ""} onChange={(e) => setOpDialog({ ...opDialog, item: { ...opDialog.item, nome: e.target.value } })} /></div>
              <div><Label>Slug</Label><Input value={opDialog.item.slug || ""} placeholder="auto-gerado" onChange={(e) => setOpDialog({ ...opDialog, item: { ...opDialog.item, slug: e.target.value } })} /></div>
              <div><Label>Logo URL</Label><Input value={opDialog.item.logo_url || ""} onChange={(e) => setOpDialog({ ...opDialog, item: { ...opDialog.item, logo_url: e.target.value } })} /></div>
              <div><Label>Observações</Label><Textarea value={opDialog.item.observacoes || ""} onChange={(e) => setOpDialog({ ...opDialog, item: { ...opDialog.item, observacoes: e.target.value } })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpDialog({ open: false, item: null })}>Cancelar</Button>
            <Button onClick={saveOperadora}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog Rede ===== */}
      <Dialog open={redeDialog.open} onOpenChange={(o) => !o && setRedeDialog({ open: false, item: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{redeDialog.item?.id ? "Editar" : "Novo"} Item da Rede</DialogTitle></DialogHeader>
          {redeDialog.item && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Nome *</Label><Input value={redeDialog.item.nome || ""} onChange={(e) => setRedeDialog({ ...redeDialog, item: { ...redeDialog.item, nome: e.target.value } })} /></div>
              <div>
                <Label>Operadora *</Label>
                <Select value={redeDialog.item.operadora_id || ""} onValueChange={(v) => setRedeDialog({ ...redeDialog, item: { ...redeDialog.item, operadora_id: v } })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{operadoras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo *</Label>
                <Select value={redeDialog.item.tipo || ""} onValueChange={(v) => setRedeDialog({ ...redeDialog, item: { ...redeDialog.item, tipo: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hospital">Hospital</SelectItem>
                    <SelectItem value="laboratorio">Laboratório</SelectItem>
                    <SelectItem value="clinica">Clínica</SelectItem>
                    <SelectItem value="pronto_socorro">Pronto Socorro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Especialidades (separadas por vírgula)</Label>
                <Input value={(redeDialog.item.especialidades || []).join(", ")} onChange={(e) => setRedeDialog({ ...redeDialog, item: { ...redeDialog.item, especialidades: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } })} />
              </div>
              <div><Label>CEP</Label><Input value={redeDialog.item.cep || ""} onChange={(e) => setRedeDialog({ ...redeDialog, item: { ...redeDialog.item, cep: e.target.value } })} /></div>
              <div><Label>Telefone</Label><Input value={redeDialog.item.telefone || ""} onChange={(e) => setRedeDialog({ ...redeDialog, item: { ...redeDialog.item, telefone: e.target.value } })} /></div>
              <div className="col-span-2"><Label>Endereço</Label><Input value={redeDialog.item.endereco || ""} onChange={(e) => setRedeDialog({ ...redeDialog, item: { ...redeDialog.item, endereco: e.target.value } })} /></div>
              <div><Label>Bairro</Label><Input value={redeDialog.item.bairro || ""} onChange={(e) => setRedeDialog({ ...redeDialog, item: { ...redeDialog.item, bairro: e.target.value } })} /></div>
              <div><Label>Cidade *</Label><Input value={redeDialog.item.cidade || ""} onChange={(e) => setRedeDialog({ ...redeDialog, item: { ...redeDialog.item, cidade: e.target.value } })} /></div>
              <div><Label>Estado (UF) *</Label><Input maxLength={2} value={redeDialog.item.estado || ""} onChange={(e) => setRedeDialog({ ...redeDialog, item: { ...redeDialog.item, estado: e.target.value.toUpperCase() } })} /></div>
              <div className="col-span-2"><Label>Planos aplicáveis (separados por vírgula, vazio = todos)</Label>
                <Input value={(redeDialog.item.planos_aplicaveis || []).join(", ")} onChange={(e) => setRedeDialog({ ...redeDialog, item: { ...redeDialog.item, planos_aplicaveis: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRedeDialog({ open: false, item: null })}>Cancelar</Button>
            <Button onClick={saveRede}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog Coparticipação ===== */}
      <Dialog open={coDialog.open} onOpenChange={(o) => !o && setCoDialog({ open: false, item: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{coDialog.item?.id ? "Editar" : "Nova"} Tabela de Coparticipação</DialogTitle></DialogHeader>
          {coDialog.item && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Operadora *</Label>
                  <Select value={coDialog.item.operadora_id || ""} onValueChange={(v) => setCoDialog({ ...coDialog, item: { ...coDialog.item, operadora_id: v } })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{operadoras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Plano (opcional)</Label><Input value={coDialog.item.plano_nome || ""} placeholder="Ex: Smart 200" onChange={(e) => setCoDialog({ ...coDialog, item: { ...coDialog.item, plano_nome: e.target.value } })} /></div>
              </div>
              <div><Label>Modalidade</Label><Input value={coDialog.item.modalidade || "padrao"} onChange={(e) => setCoDialog({ ...coDialog, item: { ...coDialog.item, modalidade: e.target.value } })} /></div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Itens</Label>
                  <Button size="sm" variant="outline" onClick={() => setCoDialog({ ...coDialog, item: { ...coDialog.item, itens: [...(coDialog.item?.itens || []), { item: "", valor: "" }] } })}>
                    <Plus className="w-3 h-3 mr-1" /> Item
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {(coDialog.item.itens || []).map((it, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input placeholder="Procedimento (ex: Consulta)" value={it.item} onChange={(e) => {
                        const arr = [...(coDialog.item?.itens || [])];
                        arr[idx] = { ...arr[idx], item: e.target.value };
                        setCoDialog({ ...coDialog, item: { ...coDialog.item, itens: arr } });
                      }} />
                      <Input placeholder="Valor (ex: 30% ou R$ 50)" value={it.valor} onChange={(e) => {
                        const arr = [...(coDialog.item?.itens || [])];
                        arr[idx] = { ...arr[idx], valor: e.target.value };
                        setCoDialog({ ...coDialog, item: { ...coDialog.item, itens: arr } });
                      }} />
                      <Button size="sm" variant="ghost" onClick={() => {
                        const arr = (coDialog.item?.itens || []).filter((_, i) => i !== idx);
                        setCoDialog({ ...coDialog, item: { ...coDialog.item, itens: arr } });
                      }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
              <div><Label>Observações</Label><Textarea value={coDialog.item.observacoes || ""} onChange={(e) => setCoDialog({ ...coDialog, item: { ...coDialog.item, observacoes: e.target.value } })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCoDialog({ open: false, item: null })}>Cancelar</Button>
            <Button onClick={saveCopart}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
