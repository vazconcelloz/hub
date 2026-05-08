import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { api } from "@/lib/api";

interface Convite {
  id: string; email: string; role: "admin" | "user"; setor_id: string | null;
  status: string; token: string; expira_em: string; created_at: string;
}
interface Setor { id: string; nome: string; }

export function useConvites() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["convites"],
    queryFn: async () => {
      const [{ data: c }, { data: s }] = await Promise.all([
        db.from("convites").select("*").order("created_at", { ascending: false }),
        db.from("setores").select("id, nome").order("nome"),
      ]);
      return {
        convites: (c as Convite[]) ?? [],
        setores: (s as Setor[]) ?? []
      };
    },
  });

  const criarConviteMutation = useMutation({
    mutationFn: async ({ novo, userId }: { novo: any, userId: string }) => {
      const { data: created, error } = await db.from("convites").insert({
        email: novo.email,
        role: novo.role,
        setor_id: novo.setor_id || null,
        convidado_por: userId,
      }).select("id").single();
      
      if (error) throw new Error(error.message);
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["convites"] });
    }
  });

  const cancelarConviteMutation = useMutation({
    mutationFn: async (id: string) => {
      await db.from("convites").update({ status: "cancelado" }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["convites"] });
    }
  });

  return { 
    data, 
    isLoading, 
    error,
    criarConvite: criarConviteMutation.mutateAsync,
    cancelarConvite: cancelarConviteMutation.mutateAsync
  };
}
