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

export interface FaixaEtaria {
  min: number;
  max: number;
  valor: number;
}

export interface BeneficiarioDetalhe {
  idade: number;
  faixa: string;
  valor: number;
}

export function parseFaixasEtarias(text: string | null): FaixaEtaria[] {
  if (!text) return [];
  const faixas: FaixaEtaria[] = [];
  // Supports formats like "0-18: R$250,00 | 19-23: R$310,50" or "0-18: 250.00 | 19-23: 310.50"
  const parts = text.split("|").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const match = part.match(/(\d+)\s*[-–a]\s*(\d+)\s*:\s*R?\$?\s*([\d.,]+)/i);
    if (match) {
      const min = parseInt(match[1]);
      const max = parseInt(match[2]);
      const valorStr = match[3].replace(/\./g, "").replace(",", ".");
      const valor = parseFloat(valorStr);
      if (!isNaN(min) && !isNaN(max) && !isNaN(valor)) {
        faixas.push({ min, max, valor });
      }
    }
  }
  return faixas;
}

export function parseIdades(text: string | null): number[] {
  if (!text) return [];
  return text.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
}

export function calcularTotalPorFaixas(idades: number[], faixas: FaixaEtaria[]): { detalhes: BeneficiarioDetalhe[]; total: number } {
  const detalhes: BeneficiarioDetalhe[] = [];
  let total = 0;
  for (const idade of idades) {
    const faixa = faixas.find((f) => idade >= f.min && idade <= f.max);
    if (faixa) {
      detalhes.push({ idade, faixa: `${faixa.min}-${faixa.max}`, valor: faixa.valor });
      total += faixa.valor;
    } else {
      detalhes.push({ idade, faixa: "Não encontrada", valor: 0 });
    }
  }
  return { detalhes, total };
}
