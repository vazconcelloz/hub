import { Home, GraduationCap, BookOpen, Target, FileSpreadsheet, Settings, LogOut, Moon, Sun, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import logoHorizontal from "@/assets/logo-fbn-horizontal.png";
import logoIcon from "@/assets/favicon-fbn.png";

const items = [
  { title: "Início", url: "/app", icon: Home, exact: true },
  { title: "Treinamentos", url: "/app/treinamentos", icon: GraduationCap },
  { title: "Manuais", url: "/app/manuais", icon: BookOpen },
  { title: "Segmentações", url: "/app/segmentacoes", icon: Target },
  { title: "Cotações", url: "/app/cotacoes", icon: FileSpreadsheet },
  { title: "Configurações", url: "/app/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  // Na home (/app) a sidebar fica fixa, sem botão de recolher.
  // Em qualquer outra seção, o botão de recolher aparece.
  const isHome = pathname === "/app";
  const showCollapseButton = !isHome;

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-[hsl(var(--hub-border))] bg-[hsl(var(--hub-surface))]">
      <SidebarHeader className="border-b border-[hsl(var(--hub-border))] bg-[hsl(var(--hub-surface))] px-3 py-4">
        <div className="flex items-center justify-center h-12">
          <img
            src={logoHorizontal}
            alt="Grupo FBN"
            className={`h-12 w-auto object-contain ${collapsed ? "hidden" : "block"}`}
          />
          <img
            src={logoIcon}
            alt="Grupo FBN"
            className={`h-8 w-8 object-contain ${collapsed ? "block" : "hidden"}`}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-[hsl(var(--hub-surface))]">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-[hsl(var(--hub-text-muted))]">Navegação</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item.url, item.exact);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.exact}
                        className={`flex items-center gap-2 rounded-md transition-colors ${
                          active
                            ? "!bg-[hsl(var(--hub-primary))] !text-[hsl(var(--hub-primary-foreground))]"
                            : "text-[hsl(var(--hub-text))] hover:bg-[hsl(var(--hub-surface-muted))]"
                        }`}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[hsl(var(--hub-border))] bg-[hsl(var(--hub-surface))] p-2 gap-1">
        <SidebarMenu>
          {/* Recolher / expandir — só fora da home */}
          {showCollapseButton && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={toggleSidebar}
                tooltip={collapsed ? "Expandir menu" : "Recolher menu"}
                className="text-[hsl(var(--hub-text))] hover:bg-[hsl(var(--hub-surface-muted))]"
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4 shrink-0" /> : <PanelLeftClose className="h-4 w-4 shrink-0" />}
                {!collapsed && <span>Recolher menu</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* Toggle de tema */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleTheme}
              tooltip={theme === "dark" ? "Modo claro" : "Modo escuro"}
              className="text-[hsl(var(--hub-text))] hover:bg-[hsl(var(--hub-surface-muted))]"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
              {!collapsed && <span>{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Sair */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              tooltip="Sair"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
