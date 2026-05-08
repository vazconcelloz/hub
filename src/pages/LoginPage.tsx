import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import logoHorizontal from "@/assets/logo-fbn-horizontal.png";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    db.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/app", { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    // Força o modo claro exclusivamente na tela de login
    const root = document.documentElement;
    const isDark = root.classList.contains("dark");
    
    if (isDark) {
      root.classList.remove("dark");
    }
    
    // Restaura o modo escuro ao sair da tela de login (caso o usuário usasse)
    return () => {
      if (isDark) {
        root.classList.add("dark");
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast({ title: "Dados inválidos", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await db.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
      if (error) throw error;
      navigate("/app", { replace: true });
    } catch (err: any) {
      const msg = err?.message || "Erro ao autenticar";
      const friendly = msg.includes("grupofbn.com.br") ? `Apenas e-mails ${ALLOWED_DOMAIN} são permitidos.` : msg;
      toast({ title: "Falha", description: friendly, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--hub-background))] relative overflow-hidden px-4">
      {/* Premium Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[hsl(var(--hub-primary))] opacity-[0.15] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600 opacity-10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <Card className="p-8 sm:p-10 bg-[hsl(var(--hub-surface))]/90 backdrop-blur-xl border-[hsl(var(--hub-border))]/50 shadow-2xl rounded-3xl">
          <div className="flex flex-col items-center mb-8">
            <img 
              src={logoHorizontal} 
              alt="Grupo FBN" 
              className="h-20 sm:h-24 w-auto object-contain mb-6 drop-shadow-md transition-transform duration-500 hover:scale-105" 
            />
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-[hsl(var(--hub-border))]" />
              <p className="text-[11px] font-bold text-[hsl(var(--hub-text-muted))] uppercase tracking-[0.2em]">
                Acesso Corporativo
              </p>
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-[hsl(var(--hub-border))]" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-[hsl(var(--hub-text-muted))] uppercase tracking-wider ml-1">
                E-mail corporativo
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={`voce${ALLOWED_DOMAIN}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 bg-[hsl(var(--hub-background))]/50 border-[hsl(var(--hub-border))] focus-visible:ring-[hsl(var(--hub-primary))] rounded-xl px-4 transition-all"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold text-[hsl(var(--hub-text-muted))] uppercase tracking-wider ml-1">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-12 bg-[hsl(var(--hub-background))]/50 border-[hsl(var(--hub-border))] focus-visible:ring-[hsl(var(--hub-primary))] rounded-xl px-4 pr-12 transition-all tracking-widest placeholder:tracking-normal"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--hub-text-muted))] hover:text-[hsl(var(--hub-text))] transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 bg-gradient-to-r from-[hsl(var(--hub-primary))] to-blue-600 hover:from-[hsl(var(--hub-primary-hover))] hover:to-blue-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              Acessar Plataforma
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
