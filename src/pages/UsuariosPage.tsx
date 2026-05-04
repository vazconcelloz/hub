import { UserCog } from "lucide-react";
import UsuariosTab from "@/components/configuracoes/UsuariosTab";

export default function UsuariosPage() {
  return (
    <div className="px-6 md:px-10 py-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-[hsl(var(--hub-primary))]/10 flex items-center justify-center">
          <UserCog className="w-5 h-5 text-[hsl(var(--hub-primary))]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--hub-text))]">Usuários</h1>
          <p className="text-sm text-[hsl(var(--hub-text-muted))]">
            Gerencie roles, setores e permissões individuais
          </p>
        </div>
      </div>
      <UsuariosTab />
    </div>
  );
}
