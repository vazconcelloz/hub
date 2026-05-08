import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface Setor { id: string; nome: string; descricao: string | null; cor: string | null; }
interface Permissao { chave: string; nome: string; modulo: string; descricao: string | null; }
interface SetorPermissao { setor_id: string; permissao_chave: string; }

export function useSetores() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["setores-permissoes"],
    queryFn: async () => {
      const response = await api.fetch('/setores');
      const payload = response.data as { 
        setores: Setor[], 
        permissoes: Permissao[], 
        setorPermissoes: SetorPermissao[] 
      };
      
      const map: Record<string, Set<string>> = {};
      payload.setorPermissoes?.forEach((r) => {
        if (!map[r.setor_id]) map[r.setor_id] = new Set();
        map[r.setor_id].add(r.permissao_chave);
      });

      return {
        setores: payload.setores || [],
        permissoes: payload.permissoes || [],
        setorPerms: map
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
  });

  const criarSetorMutation = useMutation({
    mutationFn: async (novo: { nome: string, descricao: string }) => {
      await api.fetch('/setores', { method: 'POST', body: JSON.stringify(novo) });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["setores-permissoes"] })
  });

  const excluirSetorMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.fetch(`/setores/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["setores-permissoes"] })
  });

  const togglePermissaoMutation = useMutation({
    mutationFn: async ({ setor_id, chave, checked }: { setor_id: string, chave: string, checked: boolean }) => {
      if (checked) {
        await api.fetch(`/setores/${setor_id}/permissoes`, { method: 'POST', body: JSON.stringify({ permissao_chave: chave }) });
      } else {
        await api.fetch(`/setores/${setor_id}/permissoes/${chave}`, { method: 'DELETE' });
      }
    },
    onMutate: async ({ setor_id, chave, checked }) => {
      // Para as buscas em andamento para não atropelar a interface
      await queryClient.cancelQueries({ queryKey: ["setores-permissoes"] });

      // Salva o snapshot atual para caso de erro
      const previousData = queryClient.getQueryData(["setores-permissoes"]);

      // Injeta a mudança imediatamente na tela
      queryClient.setQueryData(["setores-permissoes"], (old: any) => {
        if (!old) return old;
        const newSetorPerms = { ...old.setorPerms };
        
        // Copia o Set ou cria um novo
        newSetorPerms[setor_id] = new Set(newSetorPerms[setor_id] || []);
        
        if (checked) {
          newSetorPerms[setor_id].add(chave);
        } else {
          newSetorPerms[setor_id].delete(chave);
        }
        
        return { ...old, setorPerms: newSetorPerms };
      });

      return { previousData };
    },
    onError: (err, newTodo, context) => {
      // Se a API falhar (ex: sem internet), desfaz o check da tela
      if (context?.previousData) {
        queryClient.setQueryData(["setores-permissoes"], context.previousData);
      }
    },
    onSettled: () => {
      // Por garantia, pede a lista real do banco em background
      queryClient.invalidateQueries({ queryKey: ["setores-permissoes"] });
    }
  });

  return { 
    data, 
    isLoading, 
    error,
    criarSetor: criarSetorMutation.mutateAsync,
    excluirSetor: excluirSetorMutation.mutateAsync,
    togglePerm: togglePermissaoMutation.mutateAsync
  };
}
