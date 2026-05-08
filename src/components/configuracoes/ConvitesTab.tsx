import { useState } from "react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, Plus, Trash2, Copy, Send } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useConvites } from "@/hooks/useConvites";

interface Convite {
  id: string; email: string; role: "admin" | "user"; setor_id: string | null;
  status: string; token: string; expira_em: string; created_at: string;
}
interface Setor { id: string; nome: string; }

export default function ConvitesTab() {
  const { toast } = useToast();
  const { data, isLoading, criarConvite, cancelarConvite } = useConvites();
  const [novo, setNovo] = useState({ email: "", role: "user" as "admin" | "user", setor_id: "" });

  const convites = data?.convites || [];
  const setores = data?.setores || [];

  const criar = async () => {
    if (!novo.email.endsWith("@grupofbn.com.br")) {
      toast({ title: "E-mail inválido", description: "Use um e-mail @grupofbn.com.br", variant: "destructive" });
      return;
    }
    try {
      const { data: u } = await db.auth.getUser() as { data: { user: { id: string } | null } };
      const createdId = await criarConvite({ novo, userId: u?.user?.id as string });
      
      setNovo({ email: "", role: "user", setor_id: "" });
      await enviarEmail(createdId.id, { silent: true });
    } catch (error: unknown) {
      toast({ title: "Erro", description: (error as Error).message, variant: "destructive" });
    }
  };

  const enviarEmail = async (convite_id: string, opts: { silent?: boolean } = {}) => {
    try {
      const { data, error } = await db.functions.invoke("send-convite-email", {
        body: { convite_id },
      });
      if (error) throw error;
      if (data?.sent) {
        toast({ title: "Convite enviado por e-mail" });
      } else if (data?.reason === "email_not_configured") {
        if (!opts.silent) {
          toast({
            title: "Convite criado",
            description: "Envio por e-mail ainda não configurado. Copie o link e envie manualmente.",
          });
        } else {
          toast({ title: "Convite criado", description: "Copie o link para enviar manualmente." });
        }
      } else {
        toast({
          title: "Convite criado",
          description: "Não foi possível enviar o e-mail. Copie o link manualmente.",
          variant: "destructive",
        });
      }
    } catch (e: unknown) {
      toast({
        title: opts.silent ? "Convite criado" : "Falha ao reenviar",
        description: e instanceof Error ? e.message : "Copie o link manualmente.",
        variant: opts.silent ? "default" : "destructive",
      });
    }
  };

  const cancelar = async (id: string) => {
    try {
      await cancelarConvite(id);
      toast({ title: "Convite cancelado" });
    } catch (e: unknown) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  };

  const copiarLink = (token: string) => {
    const link = `${window.location.origin}/login?convite=${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado", description: "Envie esse link ao convidado." });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

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
          <Select value={novo.role} onValueChange={(v) => setNovo({ ...novo, role: v as "admin" | "user" })}>
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
                    <Button variant="outline" size="sm" onClick={() => enviarEmail(c.id)}>
                      <Send className="w-4 h-4 mr-1" /> Reenviar e-mail
                    </Button>
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
