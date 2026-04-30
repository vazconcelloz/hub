import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Setor { id: string; nome: string; descricao: string | null; cor: string | null; }
interface Permissao { chave: string; nome: string; modulo: string; descricao: string | null; }

export default function RolesPermissoesTab() {
  const { toast } = useToast();
  const [setores, setSetores] = useState<Setor[]>([]);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [setorPerms, setSetorPerms] = useState<Record<string, Set<string>>>({});
  const [novo, setNovo] = useState({ nome: "", descricao: "" });
  const [editing, setEditing] = useState<Setor | null>(null);

  const load = async () => {
    const [{ data: sts }, { data: perms }, { data: sp }] = await Promise.all([
      supabase.from("setores").select("*").order("nome"),
      supabase.from("permissoes").select("*").order("modulo, nome"),
      supabase.from("setor_permissoes").select("setor_id, permissao_chave"),
    ]);
    setSetores(sts ?? []);
    setPermissoes(perms ?? []);
    const map: Record<string, Set<string>> = {};
    sp?.forEach((r) => {
      if (!map[r.setor_id]) map[r.setor_id] = new Set();
      map[r.setor_id].add(r.permissao_chave);
    });
    setSetorPerms(map);
  };

  useEffect(() => { load(); }, []);

  const criarSetor = async () => {
    if (!novo.nome.trim()) return;
    const { error } = await supabase.from("setores").insert(novo);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { setNovo({ nome: "", descricao: "" }); toast({ title: "Setor criado" }); load(); }
  };

  const excluirSetor = async (id: string) => {
    if (!confirm("Excluir este setor? Usuários ligados perdem essa associação.")) return;
    await supabase.from("setores").delete().eq("id", id);
    load();
  };

  const togglePerm = async (setor_id: string, chave: string, checked: boolean) => {
    if (checked) {
      await supabase.from("setor_permissoes").insert({ setor_id, permissao_chave: chave });
    } else {
      await supabase.from("setor_permissoes").delete()
        .eq("setor_id", setor_id).eq("permissao_chave", chave);
    }
    load();
  };

  const permsByModulo = permissoes.reduce((acc, p) => {
    (acc[p.modulo] = acc[p.modulo] || []).push(p);
    return acc;
  }, {} as Record<string, Permissao[]>);

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Roles do sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border rounded-lg p-3">
            <Badge>Admin</Badge>
            <p className="text-sm text-muted-foreground mt-2">
              Acesso total. Gerencia usuários, setores e permissões.
            </p>
          </div>
          <div className="border rounded-lg p-3">
            <Badge variant="secondary">Usuário</Badge>
            <p className="text-sm text-muted-foreground mt-2">
              Acesso conforme permissões dos setores aos quais pertence (e overrides individuais).
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Setores</h3>
        </div>

        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Nome do setor (ex: Comercial)"
            value={novo.nome}
            onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
          />
          <Input
            placeholder="Descrição (opcional)"
            value={novo.descricao}
            onChange={(e) => setNovo({ ...novo, descricao: e.target.value })}
          />
          <Button onClick={criarSetor}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          {setores.map((s) => (
            <div key={s.id} className="flex items-center justify-between border rounded px-3 py-2">
              <div className="min-w-0">
                <p className="font-medium">{s.nome}</p>
                {s.descricao && <p className="text-xs text-muted-foreground">{s.descricao}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {setorPerms[s.id]?.size ?? 0} permissões
                </p>
              </div>
              <div className="flex gap-1">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setEditing(s)}>
                      <Settings2 className="w-4 h-4 mr-1" /> Permissões
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Permissões do setor — {editing?.nome}</DialogTitle>
                    </DialogHeader>
                    {editing && (
                      <div className="space-y-4">
                        {Object.entries(permsByModulo).map(([modulo, perms]) => (
                          <div key={modulo}>
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                              {modulo}
                            </p>
                            <div className="space-y-1">
                              {perms.map((p) => {
                                const checked = setorPerms[editing.id]?.has(p.chave) ?? false;
                                return (
                                  <label key={p.chave} className="flex items-start gap-2 text-sm border rounded px-2 py-1.5">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(c) => togglePerm(editing.id, p.chave, !!c)}
                                    />
                                    <div>
                                      <p>{p.nome}</p>
                                      {p.descricao && <p className="text-xs text-muted-foreground">{p.descricao}</p>}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" size="icon" onClick={() => excluirSetor(s.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {setores.length === 0 && (
            <p className="text-center text-muted-foreground py-6 text-sm">
              Nenhum setor cadastrado ainda.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
