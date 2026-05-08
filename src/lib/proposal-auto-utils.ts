import { Tables, TablesInsert } from "@/types/database";
import { generateSlug, formatCurrency, STATUS_LABELS, STATUS_COLORS } from "@/lib/proposal-utils";

export type PropostaAuto = Tables<"propostas_auto">;
export type PropostaAutoInsert = TablesInsert<"propostas_auto">;
export type AutoCotacao = Tables<"proposta_auto_seguradoras">;
export type AutoCotacaoInsert = TablesInsert<"proposta_auto_seguradoras">;

export { generateSlug, formatCurrency, STATUS_LABELS, STATUS_COLORS };
