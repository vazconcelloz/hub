import { Fragment } from "react";
import type { Operadora } from "@/lib/proposal-utils";
import {
  formatCurrency,
  COLUNA_COLORS,
  getColunaColor,
  parseFaixasEtarias,
} from "@/lib/proposal-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette, Check, Plus, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

import type { EditableOperadoraField, CoparticipacaoItem, CriterioDefinition } from "./types";

// ——— Coparticipação ———

export const COPARTICIPACAO_ITENS_PADRAO: CoparticipacaoItem[] = [
  { item: "Consulta", valor: "" },
  { item: "Exames simples", valor: "" },
  { item: "Exames complexos", valor: "" },
  { item: "Terapias", valor: "" },
  { item: "Pronto-socorro", valor: "" },
  { item: "Internação", valor: "" },
];

export function parseCoparticipacaoDetalhes(val: any): CoparticipacaoItem[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .filter((x) => x && typeof x === "object" && typeof x.item === "string")
      .map((x) => ({ item: String(x.item), valor: String(x.valor ?? "") }));
  }
  return [];
}

// ——— Color helpers ———

export const headerClassFor = (op: Operadora) => {
  const c = getColunaColor(op.cor_coluna);
  return c ? c.header : "bg-primary text-primary-foreground";
};

export const borderClassFor = (op: Operadora) => {
  const c = getColunaColor(op.cor_coluna);
  return c ? c.border : "border-primary";
};

export const rotuloCellClassFor = (op: Operadora | undefined) => {
  if (!op) return "bg-muted/40 text-foreground";
  const c = getColunaColor(op.cor_coluna);
  return c ? c.cell : "bg-muted/40 text-foreground";
};

// ——— Render helpers ———

export function renderCellValue(val: string | null | undefined) {
  if (!val || !val.trim()) return <span className="text-muted-foreground">—</span>;
  if (val.includes("\n") || val.split(/[,;]/).length > 2) {
    const items = val
      .split(/[\n,;]+/)
      .map((s) => s.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter((s) => s.length > 1)
      .slice(0, 3);
    return (
      <ul className="text-xs space-y-1 text-left">
        {items.map((s, i) => <li key={i}>• {s}</li>)}
      </ul>
    );
  }
  return <span className="whitespace-pre-line">{val}</span>;
}

export function renderFaixasEtarias(val: string | null | undefined) {
  if (!val || !val.trim()) return <span className="text-muted-foreground">—</span>;
  const faixas = parseFaixasEtarias(val);
  if (faixas.length === 0) return <span className="whitespace-pre-line text-xs">{val}</span>;
  return (
    <details className="group rounded-md border border-border/60 bg-background/40 overflow-hidden">
      <summary className="cursor-pointer list-none px-2 py-1.5 text-xs font-medium flex items-center justify-between gap-2 hover:bg-muted/40 select-none">
        <span className="inline-flex items-center gap-1.5">
          <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
          Ver faixas ({faixas.length})
        </span>
        <span className="text-muted-foreground tabular-nums">
          {formatCurrency(Math.min(...faixas.map((f) => f.valor)))}+
        </span>
      </summary>
      <table className="w-full text-xs border-t border-border/60">
        <tbody>
          {faixas.map((f, i) => {
            const label = f.max >= 99 ? `${f.min}+` : `${f.min}–${f.max}`;
            return (
              <tr key={i} className={i % 2 ? "bg-muted/40" : ""}>
                <td className="px-2 py-1 font-medium tabular-nums whitespace-nowrap">{label}</td>
                <td className="px-2 py-1 text-right tabular-nums whitespace-nowrap">{formatCurrency(f.valor)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </details>
  );
}

export function renderCoparticipacao(op: Operadora) {
  const valor = (op.coparticipacao ?? "").trim();
  const detalhes = parseCoparticipacaoDetalhes(op.coparticipacao_detalhes).filter((d) => d.valor.trim());
  const eSimOuParcial = /^(sim|parcial)$/i.test(valor);
  const labelTopo = valor || "—";

  if (!eSimOuParcial || detalhes.length === 0) {
    return <span className="whitespace-pre-line">{labelTopo}</span>;
  }
  return (
    <div className="space-y-1.5">
      <div className="font-medium">{labelTopo}</div>
      <details className="group rounded-md border border-border/60 bg-background/40 overflow-hidden">
        <summary className="cursor-pointer list-none px-2 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-muted/40 select-none">
          <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
          Ver detalhes ({detalhes.length})
        </summary>
        <table className="w-full text-xs border-t border-border/60">
          <tbody>
            {detalhes.map((d, i) => (
              <tr key={i} className={i % 2 ? "bg-muted/40" : ""}>
                <td className="px-2 py-1 whitespace-nowrap">{d.item}</td>
                <td className="px-2 py-1 text-right tabular-nums whitespace-nowrap font-medium">{d.valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

// ——— Editable cell renderer ———

export function renderEditableCell(
  op: Operadora,
  crit: CriterioDefinition,
  updateDraftOperadora: (id: string, field: EditableOperadoraField, value: any) => void,
) {
  const value = (op[crit.field as keyof Operadora] as string | null) ?? "";
  if (crit.type === "sim_nao") {
    return (
      <Select value={value || ""} onValueChange={(v) => updateDraftOperadora(op.id, crit.field, v)}>
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Sim">Sim</SelectItem>
          <SelectItem value="Parcial">Parcial</SelectItem>
          <SelectItem value="Não">Não</SelectItem>
        </SelectContent>
      </Select>
    );
  }
  if (crit.type === "acomodacao") {
    return (
      <Select value={value || ""} onValueChange={(v) => updateDraftOperadora(op.id, crit.field, v)}>
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Enfermaria">Enfermaria</SelectItem>
          <SelectItem value="Apartamento">Apartamento</SelectItem>
        </SelectContent>
      </Select>
    );
  }
  if (crit.type === "reembolso") {
    return (
      <Select value={value || ""} onValueChange={(v) => updateDraftOperadora(op.id, crit.field, v)}>
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Sim">Sim</SelectItem>
          <SelectItem value="Não">Não</SelectItem>
          <SelectItem value="Parcial">Parcial</SelectItem>
        </SelectContent>
      </Select>
    );
  }
  if (crit.type === "textarea") {
    return (
      <Textarea
        value={value}
        onChange={(e) => updateDraftOperadora(op.id, crit.field, e.target.value)}
        className="text-xs min-h-[70px]"
      />
    );
  }
  return (
    <Input
      value={value}
      onChange={(e) => updateDraftOperadora(op.id, crit.field, e.target.value)}
      className="h-8 text-xs"
    />
  );
}

// ——— Color palette renderer ———

export function renderPalette(currentKey: string | null, onPick: (key: string | null) => void) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      <button
        type="button"
        onClick={() => onPick(null)}
        className={cn(
          "h-8 rounded border text-[10px] flex items-center justify-center bg-background hover:bg-muted",
          !currentKey && "ring-2 ring-primary"
        )}
        title="Sem cor"
      >
        —
      </button>
      {Object.entries(COLUNA_COLORS).map(([key, c]) => (
        <button
          key={key}
          type="button"
          onClick={() => onPick(key)}
          className={cn(
            "h-8 rounded flex items-center justify-center",
            c.header,
            currentKey === key && "ring-2 ring-offset-1 ring-foreground"
          )}
          title={c.label}
        >
          {currentKey === key && <Check className="w-3 h-3" />}
        </button>
      ))}
    </div>
  );
}

// ——— Color Pickers ———

export function OperadoraColorPicker({
  operadoraNome,
  planos,
  onPick,
}: {
  operadoraNome: string;
  planos: Operadora[];
  onPick: (nome: string, key: string | null) => void;
}) {
  const current = planos.find((p) => p.cor_coluna)?.cor_coluna ?? null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-7 px-2 text-[11px] gap-1 shrink-0",
            current && COLUNA_COLORS[current]?.header
          )}
          title="Cor desta operadora"
        >
          <Palette className={cn("w-3 h-3", current ? "text-white" : "text-muted-foreground")} />
          Cor da operadora
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <p className="text-xs font-medium mb-2">Cor da operadora "{operadoraNome}"</p>
        <p className="text-[10px] text-muted-foreground mb-2">Aplica a todos os planos desta tabela.</p>
        {renderPalette(current, (k) => onPick(operadoraNome, k))}
      </PopoverContent>
    </Popover>
  );
}

// ——— Coparticipação Editor ———

export function CoparticipacaoEditor({
  op,
  onChange,
}: {
  op: Operadora;
  onChange: (id: string, field: EditableOperadoraField, value: any) => void;
}) {
  const valor = (op.coparticipacao ?? "").trim();
  const eSimOuParcial = /^(sim|parcial)$/i.test(valor);
  if (!eSimOuParcial) return null;

  const atual = parseCoparticipacaoDetalhes(op.coparticipacao_detalhes);
  const lista = atual.length > 0 ? atual : COPARTICIPACAO_ITENS_PADRAO;

  const update = (next: CoparticipacaoItem[]) => {
    const limpos = next.filter((d) => d.item.trim() || d.valor.trim());
    onChange(op.id, "coparticipacao_detalhes", limpos.length > 0 ? limpos : null);
  };

  return (
    <div className="mt-2 rounded-md border border-border/60 bg-background/40 p-2 space-y-1.5">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        Detalhes da coparticipação
      </div>
      {lista.map((d, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            value={d.item}
            onChange={(e) => {
              const next = [...lista];
              next[i] = { ...next[i], item: e.target.value };
              update(next);
            }}
            placeholder="Item"
            className="h-7 text-xs flex-1"
          />
          <Input
            value={d.valor}
            onChange={(e) => {
              const next = [...lista];
              next[i] = { ...next[i], valor: e.target.value };
              update(next);
            }}
            placeholder="ex: 30% ou R$ 25"
            className="h-7 text-xs w-32"
          />
          <button
            type="button"
            onClick={() => {
              const next = lista.filter((_, idx) => idx !== i);
              update(next);
            }}
            className="h-7 w-7 rounded border flex items-center justify-center hover:bg-muted shrink-0"
            title="Remover"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => update([...lista, { item: "", valor: "" }])}
        className="text-xs flex items-center gap-1 text-primary hover:underline"
      >
        <Plus className="w-3 h-3" /> Adicionar linha
      </button>
    </div>
  );
}
