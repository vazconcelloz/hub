import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

export default function MeuPerfilTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState({
    user_id: "",
    email: "",
    display_name: "",
    telefone: "",
    avatar_url: "",
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.user_id}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await db.storage.from('avatars').upload(fileName, file);
      
      if (error) throw error;
      
      if (data?.path) {
        const { data: urlData } = db.storage.from('avatars').getPublicUrl(data.path);
        setProfile({ ...profile, avatar_url: urlData.publicUrl });
        toast({ title: "Imagem carregada", description: "Não esqueça de clicar em 'Salvar alterações' para confirmar." });
      }
    } catch (error: unknown) {
      toast({ title: "Erro no upload", description: (error as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: u } = await db.auth.getUser() as { data: { user: { id: string, email?: string } | null } };
        if (!u?.user) {
          if (mounted) setLoading(false);
          return;
        }
        
        const { data } = await db
          .from("profiles")
          .select("*")
          .eq("user_id", u.user.id)
          .single();
          
        if (mounted) {
          setProfile({
            user_id: u.user.id,
            email: u.user.email ?? "",
            display_name: (data as any)?.display_name ?? "",
            telefone: (data as any)?.telefone ?? "",
            avatar_url: (data as any)?.avatar_url ?? "",
          });
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      // 1. Checa se o perfil já existe
      const { data: existing } = await db.from("profiles").select("*").eq("user_id", profile.user_id).single();
      
      let error = null;
      
      // 2. Se existe, atualiza. Se não, insere.
      if (existing) {
        const res = await db.from("profiles").update({
          display_name: profile.display_name,
          telefone: profile.telefone,
          avatar_url: profile.avatar_url,
        }).eq("user_id", profile.user_id);
        error = res.error;
      } else {
        const res = await db.from("profiles").insert({
          user_id: profile.user_id,
          email: profile.email,
          display_name: profile.display_name,
          telefone: profile.telefone,
          avatar_url: profile.avatar_url,
        });
        error = res.error;
      }

      if (error) {
        toast({ title: "Erro", description: (error as Error).message, variant: "destructive" });
      } else {
        toast({ title: "Perfil atualizado" });
      }
    } catch (e: unknown) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">Carregando...</div>;

  return (
    <div className="grid gap-6 max-w-xl">
      <div className="flex items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-4 border-background shadow-sm shrink-0">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl text-muted-foreground font-semibold">
              {profile.display_name?.charAt(0)?.toUpperCase() || profile.email?.charAt(0)?.toUpperCase() || "U"}
            </span>
          )}
        </div>
        <div>
          <Label htmlFor="avatar-upload" className="cursor-pointer">
            <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm font-medium">
              <Upload className="w-4 h-4" />
              {uploading ? "Enviando..." : "Trocar foto"}
            </div>
          </Label>
          <input 
            id="avatar-upload" 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleUpload}
            disabled={uploading}
          />
          <p className="text-xs text-muted-foreground mt-2">JPG, GIF ou PNG. Máximo de 2MB.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label>E-mail</Label>
          <Input value={profile.email} disabled className="bg-muted/50" />
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
      </div>

      <div className="pt-2">
        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
