import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export default function HubLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[hsl(var(--hub-bg))]">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Trigger flutuante para abrir/fechar a sidebar mesmo sem header */}
          <SidebarTrigger className="fixed top-3 left-3 z-40 text-[hsl(var(--hub-text))] bg-[hsl(var(--hub-surface))] border border-[hsl(var(--hub-border))] shadow-sm md:hidden" />

          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
