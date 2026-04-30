import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Settings, Users, Shield, Mail, UserCircle } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import UsuariosTab from "@/components/configuracoes/UsuariosTab";
import RolesPermissoesTab from "@/components/configuracoes/RolesPermissoesTab";
import ConvitesTab from "@/components/configuracoes/ConvitesTab";
import MeuPerfilTab from "@/components/configuracoes/MeuPerfilTab";
import { Navigate } from "react-router-dom";

export default function ConfiguracoesPage() {
  const { isAdmin, loading } = usePermissions();
  const [tab, setTab] = useState("perfil");

  useEffect(() => {
    if (isAdmin) setTab("usuarios");
  }, [isAdmin]);

  if (loading) {
    return <div className="p-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-[hsl(var(--hub-primary))]/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-[hsl(var(--hub-primary))]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--hub-text))]">Configurações</h1>
          <p className="text-sm text-[hsl(var(--hub-text-muted))]">
            Gerencie usuários, papéis, permissões e seu perfil
          </p>
        </div>
      </div>

      <Card className="p-1 bg-[hsl(var(--hub-surface))] border-[hsl(var(--hub-border))]">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="perfil" className="gap-2">
              <UserCircle className="w-4 h-4" /> Meu perfil
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="usuarios" className="gap-2">
                  <Users className="w-4 h-4" /> Usuários
                </TabsTrigger>
                <TabsTrigger value="roles" className="gap-2">
                  <Shield className="w-4 h-4" /> Roles & Permissões
                </TabsTrigger>
                <TabsTrigger value="convites" className="gap-2">
                  <Mail className="w-4 h-4" /> Convites
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <div className="p-4 md:p-6">
            <TabsContent value="perfil" className="m-0">
              <MeuPerfilTab />
            </TabsContent>
            {isAdmin && (
              <>
                <TabsContent value="usuarios" className="m-0">
                  <UsuariosTab />
                </TabsContent>
                <TabsContent value="roles" className="m-0">
                  <RolesPermissoesTab />
                </TabsContent>
                <TabsContent value="convites" className="m-0">
                  <ConvitesTab />
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
