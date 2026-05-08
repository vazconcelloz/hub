import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { api } from "@/lib/api";

interface UserRow {
  user_id: string;
  email: string;
  display_name: string;
  role: "admin" | "user";
  setor_ids: string[];
}

export function useUsuarios() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["usuarios-config"],
    queryFn: async () => {
      const [{ data: profs }, { data: roles }, { data: us }, { data: sts }, { data: perms }] = await Promise.all([
        db.from("profiles").select("*"),
        db.from("user_roles").select("*"),
        db.from("user_setores").select("*"),
        db.from("setores").select("*").order("nome"),
        db.from("permissoes").select("*").order("modulo"),
      ]);

      const rows: UserRow[] = (profs ?? []).map((p: any) => ({
        user_id: p.user_id,
        email: p.email ?? "",
        display_name: p.display_name ?? "",
        role: ((roles ?? []).find((r: any) => r.user_id === p.user_id)?.role as any) ?? "user",
        setor_ids: (us ?? []).filter((u: any) => u.user_id === p.user_id).map((u: any) => u.setor_id),
      }));

      return { rows, setores: sts ?? [], permissoes: perms ?? [] };
    },
  });

  // Mutações (Ações seguras que chamarão as novas rotas do backend)
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "user" }) => {
      // Aqui usamos a nova rota segura em vez do proxy genérico
      return api.fetch(`/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios-config"] });
    },
  });

  const toggleSetorMutation = useMutation({
    mutationFn: async ({ userId, setorId, checked }: { userId: string; setorId: string; checked: boolean }) => {
      if (checked) {
        return api.fetch(`/users/${userId}/setor`, {
          method: "POST",
          body: JSON.stringify({ setorId }),
        });
      } else {
        return api.fetch(`/users/${userId}/setor/${setorId}`, {
          method: "DELETE",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios-config"] });
    },
  });

  const saveOverrideMutation = useMutation({
    mutationFn: async ({ userId, chave, value }: { userId: string; chave: string; value: boolean | null }) => {
      if (value === null) {
        return api.fetch(`/users/${userId}/permissao/${chave}`, { method: "DELETE" });
      } else {
        return api.fetch(`/users/${userId}/permissao`, {
          method: "PUT",
          body: JSON.stringify({ permissao_chave: chave, concedida: value }),
        });
      }
    },
    onSuccess: () => {
      // We don't necessarily need to invalidate the main list if overrides aren't in it, 
      // but if we show them, we would. For now, it's fine.
    },
  });

  return { 
    data, 
    isLoading, 
    error,
    changeRole: changeRoleMutation.mutateAsync,
    toggleSetor: toggleSetorMutation.mutateAsync,
    saveOverride: saveOverrideMutation.mutateAsync
  };
}
