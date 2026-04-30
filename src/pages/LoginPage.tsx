import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const ALLOWED_DOMAIN = "@grupofbn.com.br";

const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .max(255)
    .refine((v) => v.toLowerCase().endsWith(ALLOWED_DOMAIN), {
      message: `Apenas e-mails ${ALLOWED_DOMAIN} são permitidos.`,
    }),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(128),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/app", { replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast({ title: "Dados inválidos", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
        if (error) throw error;
        navigate("/app", { replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        toast({ title: "Conta criada!", description: "Você já pode entrar." });
        setTab("login");
      }
    } catch (err: any) {
      const msg = err?.message || "Erro ao autenticar";
      const friendly = msg.includes("grupofbn.com.br") ? `Apenas e-mails ${ALLOWED_DOMAIN} são permitidos.` : msg;
      toast({ title: "Falha", description: friendly, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) {
      toast({ title: "Falha no Google", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--hub-bg))] px-4">
      <Card className="w-full max-w-md p-8 bg-[hsl(var(--hub-surface))] border-[hsl(var(--hub-border))] shadow-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-[hsl(var(--hub-primary))] text-[hsl(var(--hub-primary-foreground))] flex items-center justify-center font-bold text-lg mb-3">
            FBN
          </div>
          <h1 className="text-xl font-semibold text-[hsl(var(--hub-text))]">Hub Grupo FBN</h1>
          <p className="text-sm text-[hsl(var(--hub-text-muted))]">Acesso restrito a colaboradores</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar conta</TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">E-mail corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={`voce${ALLOWED_DOMAIN}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[hsl(var(--hub-primary))] hover:bg-[hsl(var(--hub-primary-hover))] text-[hsl(var(--hub-primary-foreground))]"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {tab === "login" ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-2">
              <div className="flex-1 h-px bg-[hsl(var(--hub-border))]" />
              <span className="text-xs text-[hsl(var(--hub-text-muted))]">ou</span>
              <div className="flex-1 h-px bg-[hsl(var(--hub-border))]" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-[hsl(var(--hub-border))]"
              onClick={handleGoogle}
              disabled={loading}
            >
              Continuar com Google
            </Button>

            <p className="text-xs text-center text-[hsl(var(--hub-text-muted))] mt-4">
              Apenas e-mails <strong>{ALLOWED_DOMAIN}</strong> são permitidos.
            </p>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
