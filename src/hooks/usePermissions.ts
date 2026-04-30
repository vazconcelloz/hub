import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "user";

interface PermissionsState {
  loading: boolean;
  userId: string | null;
  email: string | null;
  role: AppRole | null;
  permissions: Set<string>;
  isAdmin: boolean;
  has: (chave: string) => boolean;
  refresh: () => Promise<void>;
}

export function usePermissions(): PermissionsState {
  const [state, setState] = useState<{
    loading: boolean;
    userId: string | null;
    email: string | null;
    role: AppRole | null;
    permissions: Set<string>;
  }>({
    loading: true,
    userId: null,
    email: null,
    role: null,
    permissions: new Set(),
  });

  const load = async () => {
    setState((s) => ({ ...s, loading: true }));
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setState({ loading: false, userId: null, email: null, role: null, permissions: new Set() });
      return;
    }

    const [{ data: roleRows }, { data: setores }, { data: overrides }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("user_setores").select("setor_id").eq("user_id", user.id),
      supabase.from("user_permissoes").select("permissao_chave, concedida").eq("user_id", user.id),
    ]);

    const isAdmin = (roleRows ?? []).some((r) => r.role === "admin");
    const role: AppRole = isAdmin ? "admin" : "user";

    const perms = new Set<string>();

    if (isAdmin) {
      const { data: all } = await supabase.from("permissoes").select("chave");
      all?.forEach((p) => perms.add(p.chave));
    } else {
      const setorIds = (setores ?? []).map((s) => s.setor_id);
      if (setorIds.length > 0) {
        const { data: sp } = await supabase
          .from("setor_permissoes")
          .select("permissao_chave")
          .in("setor_id", setorIds);
        sp?.forEach((p) => perms.add(p.permissao_chave));
      }
      (overrides ?? []).forEach((o) => {
        if (o.concedida) perms.add(o.permissao_chave);
        else perms.delete(o.permissao_chave);
      });
    }

    setState({
      loading: false,
      userId: user.id,
      email: user.email ?? null,
      role,
      permissions: perms,
    });
  };

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

  return {
    ...state,
    isAdmin: state.role === "admin",
    has: (chave: string) => state.role === "admin" || state.permissions.has(chave),
    refresh: load,
  };
}
