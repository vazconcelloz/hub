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
// Cada entrada define classes para: header forte (coluna), borda, badge e cell (versão suave para pintar células).
export interface ColorPaletteEntry {
  label: string;
  header: string; // bg + text para o header da coluna/card (forte)
  border: string; // borda colorida (top de card)
  badge: string;  // badge
  cell: string;   // bg + text suaves para pintar células individuais
}

export const COLUNA_COLORS: Record<string, ColorPaletteEntry> = {
  // Tons fortes (Navy & Gold + complementares)
  navy:    { label: "Navy",    header: "bg-[hsl(220_50%_25%)] text-white", border: "border-[hsl(220_50%_25%)]", badge: "bg-[hsl(220_50%_25%)] text-white", cell: "bg-[hsl(220_50%_92%)] text-[hsl(220_50%_20%)]" },
  gold:    { label: "Gold",    header: "bg-[hsl(42_70%_45%)] text-white",  border: "border-[hsl(42_70%_45%)]",  badge: "bg-[hsl(42_70%_45%)] text-white",  cell: "bg-[hsl(42_80%_90%)] text-[hsl(42_70%_25%)]" },
  emerald: { label: "Verde",   header: "bg-emerald-700 text-white",        border: "border-emerald-700",        badge: "bg-emerald-700 text-white",        cell: "bg-emerald-100 text-emerald-900" },
  ruby:    { label: "Rubi",    header: "bg-rose-700 text-white",           border: "border-rose-700",           badge: "bg-rose-700 text-white",           cell: "bg-rose-100 text-rose-900" },
  indigo:  { label: "Índigo",  header: "bg-indigo-700 text-white",         border: "border-indigo-700",         badge: "bg-indigo-700 text-white",         cell: "bg-indigo-100 text-indigo-900" },
  slate:   { label: "Grafite", header: "bg-slate-700 text-white",          border: "border-slate-700",          badge: "bg-slate-700 text-white",          cell: "bg-slate-200 text-slate-900" },
  teal:    { label: "Teal",    header: "bg-teal-700 text-white",           border: "border-teal-700",           badge: "bg-teal-700 text-white",           cell: "bg-teal-100 text-teal-900" },
  copper:  { label: "Cobre",   header: "bg-orange-700 text-white",         border: "border-orange-700",         badge: "bg-orange-700 text-white",         cell: "bg-orange-100 text-orange-900" },
  violet:  { label: "Violeta", header: "bg-violet-700 text-white",         border: "border-violet-700",         badge: "bg-violet-700 text-white",         cell: "bg-violet-100 text-violet-900" },
  rose:    { label: "Rosa",    header: "bg-pink-600 text-white",           border: "border-pink-600",           badge: "bg-pink-600 text-white",           cell: "bg-pink-100 text-pink-900" },
  amber:   { label: "Âmbar",   header: "bg-amber-600 text-white",          border: "border-amber-600",          badge: "bg-amber-600 text-white",          cell: "bg-amber-100 text-amber-900" },
  sky:     { label: "Céu",     header: "bg-sky-600 text-white",            border: "border-sky-600",            badge: "bg-sky-600 text-white",            cell: "bg-sky-100 text-sky-900" },
  lime:    { label: "Lima",    header: "bg-lime-600 text-white",           border: "border-lime-600",           badge: "bg-lime-600 text-white",           cell: "bg-lime-100 text-lime-900" },
  fuchsia: { label: "Fúcsia",  header: "bg-fuchsia-700 text-white",        border: "border-fuchsia-700",        badge: "bg-fuchsia-700 text-white",        cell: "bg-fuchsia-100 text-fuchsia-900" },
  cyan:    { label: "Ciano",   header: "bg-cyan-700 text-white",           border: "border-cyan-700",           badge: "bg-cyan-700 text-white",           cell: "bg-cyan-100 text-cyan-900" },
  red:     { label: "Vermelho",header: "bg-red-700 text-white",            border: "border-red-700",            badge: "bg-red-700 text-white",            cell: "bg-red-100 text-red-900" },
  yellow:  { label: "Amarelo", header: "bg-yellow-500 text-yellow-950",    border: "border-yellow-500",         badge: "bg-yellow-500 text-yellow-950",    cell: "bg-yellow-100 text-yellow-900" },
  green:   { label: "Verde C.",header: "bg-green-600 text-white",          border: "border-green-600",          badge: "bg-green-600 text-white",          cell: "bg-green-100 text-green-900" },
  zinc:    { label: "Zinco",   header: "bg-zinc-700 text-white",           border: "border-zinc-700",           badge: "bg-zinc-700 text-white",           cell: "bg-zinc-200 text-zinc-900" },
  black:   { label: "Preto",   header: "bg-neutral-900 text-white",        border: "border-neutral-900",        badge: "bg-neutral-900 text-white",        cell: "bg-neutral-200 text-neutral-900" },
};

export function getColunaColor(key: string | null | undefined): ColorPaletteEntry | null {
  if (!key) return null;
  return COLUNA_COLORS[key] ?? null;
}

// Resolve a cor de uma célula específica de um plano (pelo nome do critério).
export function getCellColorClass(coresCelulas: any, field: string): string {
  if (!coresCelulas || typeof coresCelulas !== "object") return "";
  const key = coresCelulas[field];
  if (!key) return "";
  const c = COLUNA_COLORS[key];
  return c ? c.cell : "";
}

export function getCellColorKey(coresCelulas: any, field: string): string | null {
  if (!coresCelulas || typeof coresCelulas !== "object") return null;
  return coresCelulas[field] ?? null;
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

// Agrupa planos pelo campo `grupo_soma` (modo cliente).
// Planos sem grupo_soma ou com grupo vazio ficam sozinhos.
// Planos com o mesmo grupo_soma (case-insensitive, trimmed) são consolidados em um único item virtual,
// somando os valores mensais e listando os nomes individuais.
export interface PlanoConsolidado<T> {
  representante: T;        // primeiro plano do grupo (usado para texto, cores, etc.)
  membros: T[];            // todos os planos do grupo
  grupoLabel: string | null;
  isGrupo: boolean;        // true se tiver mais de um membro somado
}

export function consolidarGruposSoma<T extends { id: string; grupo_soma?: string | null; valor_mensal?: number | null }>(
  ops: T[]
): PlanoConsolidado<T>[] {
  const ordem: string[] = [];
  const mapa = new Map<string, T[]>();
  const isolados: PlanoConsolidado<T>[] = [];
  const resultadoOrdenado: Array<{ key: string; tipo: "grupo" | "isolado"; iso?: PlanoConsolidado<T> }> = [];

  for (const op of ops) {
    const grupoRaw = (op.grupo_soma || "").trim();
    if (!grupoRaw) {
      const iso: PlanoConsolidado<T> = { representante: op, membros: [op], grupoLabel: null, isGrupo: false };
      resultadoOrdenado.push({ key: `iso-${op.id}`, tipo: "isolado", iso });
      continue;
    }
    const key = grupoRaw.toLowerCase();
    if (!mapa.has(key)) {
      mapa.set(key, []);
      ordem.push(key);
      resultadoOrdenado.push({ key, tipo: "grupo" });
    }
    mapa.get(key)!.push(op);
  }

  return resultadoOrdenado.map((entry) => {
    if (entry.tipo === "isolado") return entry.iso!;
    const membros = mapa.get(entry.key)!;
    const label = (membros[0].grupo_soma || "").trim();
    return {
      representante: membros[0],
      membros,
      grupoLabel: label,
      isGrupo: membros.length > 1,
    };
  });
}

// Soma valores mensais de um conjunto de planos (ignora nulos).
export function somarValoresMensais<T extends { valor_mensal?: number | null }>(membros: T[]): number | null {
  let total = 0;
  let achou = false;
  for (const m of membros) {
    if (typeof m.valor_mensal === "number" && !isNaN(m.valor_mensal)) {
      total += m.valor_mensal;
      achou = true;
    }
  }
  return achou ? total : null;
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
