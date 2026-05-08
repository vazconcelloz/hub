import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Settings2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSetores } from "@/hooks/useSetores";

export default function RolesPermissoesTab() {
  const { toast } = useToast();
  const { data, isLoading, criarSetor, excluirSetor, togglePerm } = useSetores();
  
  const [novo, setNovo] = useState({ nome: "", descricao: "" });
  const [editing, setEditing] = useState<any | null>(null);

  const setores = data?.setores || [];
  const permissoes = data?.permissoes || [];
  const setorPerms = data?.setorPerms || {};

  const handleCriar = async () => {
    if (!novo.nome.trim()) return;
    try {
      await criarSetor(novo);
      setNovo({ nome: "", descricao: "" });
      toast({ title: "Setor criado" });
    } catch (error: unknown) {
      toast({ title: "Erro", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm("Excluir este setor? Usuários ligados perdem essa associação.")) return;
    try {
      await excluirSetor(id);
    } catch (error: unknown) {
      toast({ title: "Erro", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleTogglePerm = async (setor_id: string, chave: string, checked: boolean) => {
    try {
      await togglePerm({ setor_id, chave, checked });
    } catch (error: unknown) {
      toast({ title: "Erro", description: (error as Error).message, variant: "destructive" });
    }
  };

  const permsByModulo = permissoes.reduce((acc, p) => {
    (acc[p.modulo] = acc[p.modulo] || []).push(p);
    return acc;
  }, {} as Record<string, any[]>);

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
          <Button onClick={handleCriar}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </div>

        {isLoading ? (
          <div className="py-8 flex justify-center text-muted-foreground"><Loader2 className="animate-spin w-6 h-6" /></div>
        ) : (
          <div className="space-y-2">
            {setores.map((s) => (
              <div key={s.id} className="flex items-center justify-between border rounded px-3 py-2 hover:bg-muted/30 transition-colors">
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
                                    <label key={p.chave} className="flex items-start gap-2 text-sm border rounded px-2 py-1.5 hover:bg-muted/50 cursor-pointer transition-colors">
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(c) => handleTogglePerm(editing.id, p.chave, !!c)}
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
                  <Button variant="ghost" size="icon" onClick={() => handleExcluir(s.id)}>
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
        )}
      </Card>
    </div>
  );
}
