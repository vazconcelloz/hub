import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function HubLayout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const initials = email ? email.slice(0, 2).toUpperCase() : "FB";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[hsl(var(--hub-bg))]">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-[hsl(var(--hub-border))] bg-[hsl(var(--hub-surface))] px-4 sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-[hsl(var(--hub-text))]" />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-[hsl(var(--hub-text))]">
                  <div className="w-7 h-7 rounded-full bg-[hsl(var(--hub-primary))] text-[hsl(var(--hub-primary-foreground))] flex items-center justify-center text-xs font-semibold">
                    {initials}
                  </div>
                  <span className="hidden sm:inline text-sm">{email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Conta</DropdownMenuLabel>
                <DropdownMenuItem disabled className="text-xs truncate">
                  <User className="w-4 h-4 mr-2" />
                  {email || "—"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
