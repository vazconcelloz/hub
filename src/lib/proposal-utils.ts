import { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Proposta = Tables<"propostas">;
export type PropostaInsert = TablesInsert<"propostas">;
export type Operadora = Tables<"proposta_operadoras">;
export type OperadoraInsert = TablesInsert<"proposta_operadoras">;

export const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  enviada: "Enviada",
  visualizada: "Visualizada",
  em_atendimento: "Em Atendimento",
  fechada: "Fechada",
  perdida: "Perdida",
};

export const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-muted text-muted-foreground",
  enviada: "bg-blue-100 text-blue-700",
  visualizada: "bg-amber-100 text-amber-700",
  em_atendimento: "bg-emerald-100 text-emerald-700",
  fechada: "bg-green-100 text-green-800",
  perdida: "bg-red-100 text-red-700",
};

export const DESTAQUE_LABELS: Record<string, string> = {
  economico: "Mais Econômico",
  completo: "Mais Completo",
  recomendado: "Recomendado",
  custo_beneficio: "Melhor Custo-Benefício",
};

export const DESTAQUE_COLORS: Record<string, string> = {
  economico: "bg-emerald-500 text-white",
  completo: "bg-blue-600 text-white",
  recomendado: "bg-amber-500 text-white",
  custo_beneficio: "bg-purple-600 text-white",
};

export function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}
