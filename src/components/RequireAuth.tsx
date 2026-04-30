import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authed" | "anon">("loading");
  const location = useLocation();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setStatus(session ? "authed" : "anon");
    });
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "authed" : "anon");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--hub-bg))]">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--hub-primary))]" />
      </div>
    );
  }

  if (status === "anon") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
