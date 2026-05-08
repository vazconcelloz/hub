import { useState } from "react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Settings2, Loader2 } from "lucide-react";
import { useUsuarios } from "@/hooks/useUsuarios";

interface UserRow {
  user_id: string;
  email: string;
  display_name: string;
  role: "admin" | "user";
  setor_ids: string[];
}

export default function UsuariosTab() {
  const { toast } = useToast();
  const { data, isLoading, changeRole, toggleSetor, saveOverride } = useUsuarios();
  
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean | null>>({});

  const handleRoleChange = async (user_id: string, role: "admin" | "user") => {
    try {
      await changeRole({ userId: user_id, role });
      toast({ title: "Role atualizada" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleSetor = async (user_id: string, setor_id: string, checked: boolean) => {
    try {
      await toggleSetor({ userId: user_id, setorId: setor_id, checked });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const openOverrides = async (u: UserRow) => {
    setEditing(u);
    const { data } = await db
      .from("user_permissoes")
      .select("permissao_chave, concedida")
      .eq("user_id", u.user_id);
    const map: Record<string, boolean | null> = {};
    data?.forEach((d: any) => { map[d.permissao_chave] = d.concedida; });
    setOverrides(map);
  };

  const handleSaveOverride = async (chave: string, value: boolean | null) => {
    if (!editing) return;
    try {
      await saveOverride({ userId: editing.user_id, chave, value });
      setOverrides({ ...overrides, [chave]: value });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const users = data?.rows || [];
  const setores = data?.setores || [];
  const permissoes = data?.permissoes || [];

  const filtered = users.filter((u) =>
    !search || u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name.toLowerCase().includes(search.toLowerCase())
  );

  const permsByModulo = permissoes.reduce((acc: any, p: any) => {
    (acc[p.modulo] = acc[p.modulo] || []).push(p);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((u) => (
          <Card key={u.user_id} className="p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{u.display_name || u.email}</p>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                    {u.role === "admin" ? "Admin" : "Usuário"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                {u.setor_ids.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {u.setor_ids.map((sid) => {
                      const s = setores.find((x: any) => x.id === sid);
                      return s ? <Badge key={sid} variant="outline" className="text-xs">{s.nome}</Badge> : null;
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={u.role} onValueChange={(v) => handleRoleChange(u.user_id, v as any)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => openOverrides(u)}>
                      <Settings2 className="w-4 h-4 mr-1" /> Permissões
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Permissões — {editing?.display_name || editing?.email}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Setores</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {setores.map((s: any) => (
                            <label key={s.id} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={editing?.setor_ids.includes(s.id)}
                                onCheckedChange={(c) => {
                                  if (!editing) return;
                                  handleToggleSetor(editing.user_id, s.id, !!c);
                                  setEditing({
                                    ...editing,
                                    setor_ids: c
                                      ? [...editing.setor_ids, s.id]
                                      : editing.setor_ids.filter((x) => x !== s.id),
                                  });
                                }}
                              />
                              {s.nome}
                            </label>
                          ))}
                          {setores.length === 0 && (
                            <p className="text-xs text-muted-foreground col-span-2">
                              Nenhum setor cadastrado. Crie em "Roles & Permissões".
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold mb-2 block">
                          Permissões individuais (sobrescrevem o setor)
                        </Label>
                        {Object.entries(permsByModulo).map(([modulo, perms]) => (
                          <div key={modulo} className="mb-3">
                            <p className="text-xs font-medium uppercase text-muted-foreground mb-1">{modulo}</p>
                            <div className="space-y-1">
                              {perms.map((p: any) => {
                                const v = overrides[p.chave];
                                return (
                                  <div key={p.chave} className="flex items-center justify-between text-sm border rounded px-2 py-1">
                                    <span>{p.nome}</span>
                                    <Select
                                      value={v === undefined ? "herdado" : v ? "conceder" : "revogar"}
                                      onValueChange={(val) => {
                                        if (val === "herdado") handleSaveOverride(p.chave, null);
                                        else handleSaveOverride(p.chave, val === "conceder");
                                      }}
                                    >
                                      <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="herdado">Herdar setor</SelectItem>
                                        <SelectItem value="conceder">Conceder</SelectItem>
                                        <SelectItem value="revogar">Revogar</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado.</p>
        )}
      </div>
    </div>
  );
}

