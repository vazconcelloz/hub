import { Navigate } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

interface Props {
  permission?: string;
  adminOnly?: boolean;
  children: React.ReactNode;
}

export default function RequirePermission({ permission, adminOnly, children }: Props) {
  const { loading, has, isAdmin, userId } = usePermissions();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--hub-primary))]" />
      </div>
    );
  }

  if (!userId) return <Navigate to="/login" replace />;

  const allowed = adminOnly ? isAdmin : permission ? has(permission) : true;

  if (!allowed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-[hsl(var(--hub-text))]">Acesso restrito</h2>
        <p className="text-sm text-[hsl(var(--hub-text-muted))] mt-1 max-w-md">
          Você não tem permissão para acessar esta seção. Fale com um administrador
          se acredita que isso é um engano.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
