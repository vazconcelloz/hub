import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function MeuPerfilTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    user_id: "",
    email: "",
    display_name: "",
    telefone: "",
    avatar_url: "",
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", u.user.id)
        .maybeSingle();
      setProfile({
        user_id: u.user.id,
        email: u.user.email ?? "",
        display_name: data?.display_name ?? "",
        telefone: data?.telefone ?? "",
        avatar_url: data?.avatar_url ?? "",
      });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: profile.user_id,
          email: profile.email,
          display_name: profile.display_name,
          telefone: profile.telefone,
          avatar_url: profile.avatar_url,
        },
        { onConflict: "user_id" }
      );
    setSaving(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Perfil atualizado" });
  };

  if (loading) return <div className="text-muted-foreground">Carregando...</div>;

  return (
    <div className="grid gap-4 max-w-xl">
      <div>
        <Label>E-mail</Label>
        <Input value={profile.email} disabled />
      </div>
      <div>
        <Label>Nome de exibição</Label>
        <Input
          value={profile.display_name}
          onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
        />
      </div>
      <div>
        <Label>Telefone</Label>
        <Input
          value={profile.telefone}
          onChange={(e) => setProfile({ ...profile, telefone: e.target.value })}
          placeholder="(00) 00000-0000"
        />
      </div>
      <div>
        <Label>URL da foto</Label>
        <Input
          value={profile.avatar_url}
          onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div>
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
