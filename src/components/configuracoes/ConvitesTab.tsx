import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, Plus, Trash2, Copy } from "lucide-react";
import { format } from "date-fns";

interface Convite {
  id: string; email: string; role: "admin" | "user"; setor_id: string | null;
  status: string; token: string; expira_em: string; created_at: string;
}
interface Setor { id: string; nome: string; }

export default function ConvitesTab() {
  const { toast } = useToast();
  const [convites, setConvites] = useState<Convite[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [novo, setNovo] = useState({ email: "", role: "user" as "admin" | "user", setor_id: "" });

  const load = async () => {
    const [{ data: c }, { data: s }] = await Promise.all([
      supabase.from("convites").select("*").order("created_at", { ascending: false }),
      supabase.from("setores").select("id, nome").order("nome"),
    ]);
    setConvites((c as any) ?? []);
    setSetores(s ?? []);
  };

  useEffect(() => { load(); }, []);

  const criar = async () => {
    if (!novo.email.endsWith("@grupofbn.com.br")) {
      toast({ title: "E-mail inválido", description: "Use um e-mail @grupofbn.com.br", variant: "destructive" });
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("convites").insert({
      email: novo.email,
      role: novo.role,
      setor_id: novo.setor_id || null,
      convidado_por: u.user?.id,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      setNovo({ email: "", role: "user", setor_id: "" });
      toast({ title: "Convite criado" });
      load();
    }
  };

  const cancelar = async (id: string) => {
    await supabase.from("convites").update({ status: "cancelado" }).eq("id", id);
    load();
  };

  const copiarLink = (token: string) => {
    const link = `${window.location.origin}/login?convite=${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado", description: "Envie esse link ao convidado." });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Mail className="w-4 h-4" /> Novo convite
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input
            placeholder="email@grupofbn.com.br"
            value={novo.email}
            onChange={(e) => setNovo({ ...novo, email: e.target.value })}
            className="md:col-span-2"
          />
          <Select value={novo.role} onValueChange={(v) => setNovo({ ...novo, role: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Usuário</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={novo.setor_id || "none"} onValueChange={(v) => setNovo({ ...novo, setor_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Setor (opcional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem setor</SelectItem>
              {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3">
          <Button onClick={criar}><Plus className="w-4 h-4 mr-1" /> Criar convite</Button>
        </div>
      </Card>

      <div className="space-y-2">
        {convites.map((c) => (
          <Card key={c.id} className="p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{c.email}</p>
                  <Badge variant={c.status === "pendente" ? "default" : "secondary"}>{c.status}</Badge>
                  <Badge variant="outline">{c.role}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Criado {format(new Date(c.created_at), "dd/MM/yyyy")} • Expira {format(new Date(c.expira_em), "dd/MM/yyyy")}
                </p>
              </div>
              <div className="flex gap-1">
                {c.status === "pendente" && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => copiarLink(c.token)}>
                      <Copy className="w-4 h-4 mr-1" /> Copiar link
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => cancelar(c.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
        {convites.length === 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">Nenhum convite criado.</p>
        )}
      </div>
    </div>
  );
}
