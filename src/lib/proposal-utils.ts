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

// Paleta de cores para colunas/cards de plano (modo administrador).
// Cada entrada define classes para: cabeçalho da coluna, borda do card, e badge.
export interface ColorPaletteEntry {
  label: string;
  header: string; // bg + text para o header da coluna/card
  border: string; // borda colorida (top de card)
  badge: string;  // badge sutil
}

export const COLUNA_COLORS: Record<string, ColorPaletteEntry> = {
  navy:    { label: "Navy",    header: "bg-[hsl(220_50%_25%)] text-white",         border: "border-[hsl(220_50%_25%)]",         badge: "bg-[hsl(220_50%_25%)] text-white" },
  gold:    { label: "Gold",    header: "bg-[hsl(42_70%_45%)] text-white",          border: "border-[hsl(42_70%_45%)]",          badge: "bg-[hsl(42_70%_45%)] text-white" },
  emerald: { label: "Verde",   header: "bg-emerald-700 text-white",                border: "border-emerald-700",                badge: "bg-emerald-700 text-white" },
  ruby:    { label: "Rubi",    header: "bg-rose-700 text-white",                   border: "border-rose-700",                   badge: "bg-rose-700 text-white" },
  indigo:  { label: "Índigo",  header: "bg-indigo-700 text-white",                 border: "border-indigo-700",                 badge: "bg-indigo-700 text-white" },
  slate:   { label: "Grafite", header: "bg-slate-700 text-white",                  border: "border-slate-700",                  badge: "bg-slate-700 text-white" },
  teal:    { label: "Teal",    header: "bg-teal-700 text-white",                   border: "border-teal-700",                   badge: "bg-teal-700 text-white" },
  copper:  { label: "Cobre",   header: "bg-orange-700 text-white",                 border: "border-orange-700",                 badge: "bg-orange-700 text-white" },
};

export function getColunaColor(key: string | null | undefined): ColorPaletteEntry | null {
  if (!key) return null;
  return COLUNA_COLORS[key] ?? null;
}

// Agrupa operadoras por nome (preserva ordem da primeira ocorrência).
export function agruparPorOperadora<T extends { operadora_nome: string }>(ops: T[]): Array<{ nome: string; planos: T[] }> {
  const ordem: string[] = [];
  const mapa = new Map<string, T[]>();
  for (const op of ops) {
    const nome = op.operadora_nome || "Sem operadora";
    if (!mapa.has(nome)) {
      mapa.set(nome, []);
      ordem.push(nome);
    }
    mapa.get(nome)!.push(op);
  }
  return ordem.map((nome) => ({ nome, planos: mapa.get(nome)! }));
}

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

function parseValorBR(str: string): number {
  // Handle Brazilian currency formats: "1.021,63" or "1.021.63" or "412,35" or "412.35"
  const s = str.trim();
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  
  if (lastComma > lastDot) {
    // Comma is decimal separator: "1.021,63" -> remove dots, replace comma
    return parseFloat(s.replace(/\./g, "").replace(",", "."));
  } else if (lastDot > lastComma) {
    // Check if dot is decimal or thousands separator
    const afterDot = s.substring(lastDot + 1);
    if (afterDot.length <= 2) {
      // Dot is decimal: "1.021.63" or "412.35" — remove all dots except last
      const parts = s.split(".");
      const decimal = parts.pop()!;
      return parseFloat(parts.join("") + "." + decimal);
    }
    // Dot is thousands separator: "1.021" (no decimals)
    return parseFloat(s.replace(/\./g, ""));
  }
  // No separators or only one type
  return parseFloat(s.replace(/\./g, "").replace(",", "."));
}

export function parseFaixasEtarias(text: string | null): FaixaEtaria[] {
  if (!text) return [];
  const faixas: FaixaEtaria[] = [];
  const parts = text.split("|").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    // Support "59+" as open-ended range (max = 99)
    const matchOpen = part.match(/(\d+)\s*\+\s*:\s*R?\$?\s*([\d.,]+)/i);
    if (matchOpen) {
      const min = parseInt(matchOpen[1]);
      const valor = parseValorBR(matchOpen[2]);
      if (!isNaN(min) && !isNaN(valor)) {
        faixas.push({ min, max: 99, valor });
      }
      continue;
    }
    // Support "0-18: R$250,00" or "0-18: 250.00"
    const match = part.match(/(\d+)\s*[-–a]\s*(\d+)\s*:\s*R?\$?\s*([\d.,]+)/i);
    if (match) {
      const min = parseInt(match[1]);
      const max = parseInt(match[2]);
      const valor = parseValorBR(match[3]);
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
