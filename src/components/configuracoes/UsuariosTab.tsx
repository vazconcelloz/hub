import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Settings2 } from "lucide-react";

interface UserRow {
  user_id: string;
  email: string;
  display_name: string;
  role: "admin" | "user";
  setor_ids: string[];
}

interface Setor { id: string; nome: string; }
interface Permissao { chave: string; nome: string; modulo: string; }

export default function UsuariosTab() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean | null>>({});

  const load = async () => {
    const [{ data: profs }, { data: roles }, { data: us }, { data: sts }, { data: perms }] = await Promise.all([
      supabase.from("profiles").select("user_id, email, display_name"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("user_setores").select("user_id, setor_id"),
      supabase.from("setores").select("id, nome").order("nome"),
      supabase.from("permissoes").select("chave, nome, modulo").order("modulo"),
    ]);

    const rows: UserRow[] = (profs ?? []).map((p) => ({
      user_id: p.user_id,
      email: p.email ?? "",
      display_name: p.display_name ?? "",
      role: ((roles ?? []).find((r) => r.user_id === p.user_id)?.role as any) ?? "user",
      setor_ids: (us ?? []).filter((u) => u.user_id === p.user_id).map((u) => u.setor_id),
    }));
    setUsers(rows);
    setSetores(sts ?? []);
    setPermissoes(perms ?? []);
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (user_id: string, role: "admin" | "user") => {
    await supabase.from("user_roles").delete().eq("user_id", user_id);
    const { error } = await supabase.from("user_roles").insert({ user_id, role });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Role atualizada" }); load(); }
  };

  const toggleSetor = async (user_id: string, setor_id: string, checked: boolean) => {
    if (checked) {
      await supabase.from("user_setores").insert({ user_id, setor_id });
    } else {
      await supabase.from("user_setores").delete().eq("user_id", user_id).eq("setor_id", setor_id);
    }
    load();
  };

  const openOverrides = async (u: UserRow) => {
    setEditing(u);
    const { data } = await supabase
      .from("user_permissoes")
      .select("permissao_chave, concedida")
      .eq("user_id", u.user_id);
    const map: Record<string, boolean | null> = {};
    data?.forEach((d) => { map[d.permissao_chave] = d.concedida; });
    setOverrides(map);
  };

  const saveOverride = async (chave: string, value: boolean | null) => {
    if (!editing) return;
    if (value === null) {
      await supabase.from("user_permissoes").delete()
        .eq("user_id", editing.user_id).eq("permissao_chave", chave);
    } else {
      await supabase.from("user_permissoes").upsert(
        { user_id: editing.user_id, permissao_chave: chave, concedida: value },
        { onConflict: "user_id,permissao_chave" }
      );
    }
    setOverrides({ ...overrides, [chave]: value });
  };

  const filtered = users.filter((u) =>
    !search || u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name.toLowerCase().includes(search.toLowerCase())
  );

  const permsByModulo = permissoes.reduce((acc, p) => {
    (acc[p.modulo] = acc[p.modulo] || []).push(p);
    return acc;
  }, {} as Record<string, Permissao[]>);

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
                      const s = setores.find((x) => x.id === sid);
                      return s ? <Badge key={sid} variant="outline" className="text-xs">{s.nome}</Badge> : null;
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={u.role} onValueChange={(v) => changeRole(u.user_id, v as any)}>
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
                          {setores.map((s) => (
                            <label key={s.id} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={editing?.setor_ids.includes(s.id)}
                                onCheckedChange={(c) => {
                                  if (!editing) return;
                                  toggleSetor(editing.user_id, s.id, !!c);
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
                              {perms.map((p) => {
                                const v = overrides[p.chave];
                                return (
                                  <div key={p.chave} className="flex items-center justify-between text-sm border rounded px-2 py-1">
                                    <span>{p.nome}</span>
                                    <Select
                                      value={v === undefined ? "herdado" : v ? "conceder" : "revogar"}
                                      onValueChange={(val) => {
                                        if (val === "herdado") saveOverride(p.chave, null);
                                        else saveOverride(p.chave, val === "conceder");
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
