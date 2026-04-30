import { Home, GraduationCap, BookOpen, Target, FileSpreadsheet } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
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
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Início", url: "/app", icon: Home, exact: true },
  { title: "Treinamentos", url: "/app/treinamentos", icon: GraduationCap },
  { title: "Manuais", url: "/app/manuais", icon: BookOpen },
  { title: "Segmentações", url: "/app/segmentacoes", icon: Target },
  { title: "Cotações", url: "/app/cotacoes", icon: FileSpreadsheet },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon" className="border-r border-[hsl(var(--hub-border))] bg-[hsl(var(--hub-surface))]">
      <SidebarHeader className="border-b border-[hsl(var(--hub-border))] px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-[hsl(var(--hub-primary))] text-[hsl(var(--hub-primary-foreground))] flex items-center justify-center font-bold shrink-0">
            FBN
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-[hsl(var(--hub-text))]">Grupo FBN</span>
              <span className="text-xs text-[hsl(var(--hub-text-muted))]">Hub Corporativo</span>
            </div>
          )}
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
                    <SidebarMenuButton asChild isActive={active}>
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
    </Sidebar>
  );
}
