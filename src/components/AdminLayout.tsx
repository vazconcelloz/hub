import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, FileText, Shield, BookOpen } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-card sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-9 h-9 gradient-primary rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground hidden sm:inline">Corretora Digital</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/admin">
              <Button variant={location.pathname === "/admin" ? "default" : "ghost"} size="sm">
                <FileText className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Propostas</span>
              </Button>
            </Link>
            <Link to="/admin/catalogo">
              <Button variant={location.pathname === "/admin/catalogo" ? "default" : "ghost"} size="sm">
                <BookOpen className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Catálogo</span>
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </nav>
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  );
}
