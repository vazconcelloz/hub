import type { Operadora } from "@/lib/proposal-utils";
import { formatCurrency, DESTAQUE_LABELS, DESTAQUE_COLORS } from "@/lib/proposal-utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { X, Plus, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

import type { PropostaContext } from "./types";
import {
  headerClassFor,
  rotuloCellClassFor,
  renderCellValue,
  renderFaixasEtarias,
  renderCoparticipacao,
  renderEditableCell,
  OperadoraColorPicker,
  CoparticipacaoEditor,
} from "./shared";

interface Props {
  ctx: PropostaContext;
  ops: Operadora[];
  showOperadoraInHeader?: boolean;
}

export function ComparativeTable({ ctx, ops, showOperadoraInHeader = false }: Props) {
  const {
    editMode, viewOps, grupoSomaInfoById, totalById,
    selectedPlans, toggleSelected,
    updateDraftOperadora, updateOperadoraColor, removeDraftOperadora,
    addDraftOperadora, toggleLinhaOculta,
    criteriosVisiveis, linhasOcultas,
  } = ctx;

  // Calculate totals for this table
  const totais = ops.map((op) => {
    const grupo = grupoSomaInfoById.get(op.id);
    return grupo ? grupo.total : (totalById.get(op.id) ?? null);
  });
  const maior = Math.max(...totais.filter((t): t is number => t !== null), 0);
  const algum = totais.some((t) => t !== null);

  return (
    <div className="rounded-lg border border-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={cn(
                "text-left px-4 py-3 font-semibold w-56 align-top border-r border-border text-xs uppercase tracking-wide",
                ops.length > 0 ? headerClassFor(ops[0]) : "bg-muted/60 text-muted-foreground"
              )}>
                <div className="flex items-center justify-between gap-2">
                  <span>Planos</span>
                  {editMode && ops.length > 0 && (
                    <OperadoraColorPicker
                      operadoraNome={ops[0].operadora_nome || ""}
                      planos={ops}
                      onPick={(nome, key) => updateOperadoraColor(nome, key)}
                    />
                  )}
                </div>
              </th>
              {ops.map((op) => (
                <th
                  key={op.id}
                  className={cn(
                    "text-left px-4 py-3 font-semibold align-top border-r border-white/10 last:border-r-0 min-w-[180px] relative",
                    headerClassFor(op)
                  )}
                >
                  {editMode && viewOps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Excluir a coluna "${op.plano_nome || op.operadora_nome || "este plano"}"?`)) {
                          removeDraftOperadora(op.id);
                        }
                      }}
                      title="Excluir esta coluna"
                      className="absolute top-1 right-1 w-6 h-6 rounded-md bg-white/15 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="space-y-1">
                    {!editMode && (
                      <label className="flex items-center gap-1.5 text-[10px] font-normal opacity-90 cursor-pointer mb-1">
                        <Checkbox
                          checked={selectedPlans.has(op.id)}
                          onCheckedChange={() => toggleSelected(op.id)}
                          className="h-3.5 w-3.5 border-white/60 data-[state=checked]:bg-white data-[state=checked]:text-primary"
                        />
                        Comparar
                      </label>
                    )}
                    {editMode ? (
                      <>
                        <Input
                          value={op.operadora_nome ?? ""}
                          onChange={(e) => updateDraftOperadora(op.id, "operadora_nome", e.target.value)}
                          className="h-8 text-sm text-foreground"
                          placeholder="Operadora"
                        />
                        <Input
                          value={op.plano_nome ?? ""}
                          onChange={(e) => updateDraftOperadora(op.id, "plano_nome", e.target.value)}
                          className="h-7 text-xs text-foreground"
                          placeholder="Plano"
                        />
                        <Input
                          value={op.grupo_soma ?? ""}
                          onChange={(e) => updateDraftOperadora(op.id, "grupo_soma", e.target.value)}
                          className="h-6 text-[10px] text-foreground bg-amber-50 border-amber-300"
                          placeholder='Grupo soma (ex: "Sócios+Func")'
                          title="Planos com o mesmo rótulo serão somados em um único card para o cliente. O cliente NÃO vê esse rótulo."
                        />
                        <div className="flex items-center gap-1 flex-wrap">
                          <Select
                            value={op.destaque_comercial ?? "none"}
                            onValueChange={(v) =>
                              updateDraftOperadora(op.id, "destaque_comercial", v === "none" ? null : v)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs text-foreground w-32">
                              <SelectValue placeholder="Sem destaque" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem destaque</SelectItem>
                              {Object.entries(DESTAQUE_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : (
                      <>
                        {showOperadoraInHeader && op.operadora_nome && (
                          <div className="text-[10px] uppercase tracking-wide opacity-80">{op.operadora_nome}</div>
                        )}
                        {op.plano_nome && (
                          <div className="text-base leading-tight font-bold">{op.plano_nome}</div>
                        )}
                        {(() => {
                          const info = grupoSomaInfoById.get(op.id);
                          if (!info) return null;
                          const outros = info.membros
                            .filter((m) => m.id !== op.id)
                            .map((m) => m.plano_nome || m.operadora_nome)
                            .filter(Boolean)
                            .join(" + ");
                          return (
                            <div className={cn("mt-2 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border", info.cor)}>
                              <Plus className="w-2.5 h-2.5" />
                              Somado com: {outros || "outro plano"}
                            </div>
                          );
                        })()}
                        {op.destaque_comercial && DESTAQUE_LABELS[op.destaque_comercial] && (
                          <Badge className={`mt-2 text-[10px] px-2 py-0.5 ${DESTAQUE_COLORS[op.destaque_comercial]}`}>
                            {DESTAQUE_LABELS[op.destaque_comercial]}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </th>
              ))}
              {editMode && (
                <th className="bg-muted/40 border-l border-border align-middle p-2 w-12">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Adicionar coluna nesta tabela"
                    onClick={() => addDraftOperadora(ops[0]?.operadora_nome)}
                    className="h-8 w-8 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {criteriosVisiveis.map((crit) => {
              const oculta = linhasOcultas.includes(crit.field as string);
              return (
                <tr key={crit.label} className={cn(editMode && oculta && "opacity-60")}>
                  <td className={cn("px-4 py-3 font-medium border-r border-border align-top", rotuloCellClassFor(ops[0]))}>
                    <div className="flex items-center justify-between gap-2">
                      <span>{crit.label}{editMode && oculta && <span className="ml-1 text-[10px] opacity-70">(oculta)</span>}</span>
                      {editMode && (
                        <button
                          type="button"
                          onClick={() => toggleLinhaOculta(crit.field as string)}
                          className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted/30 shrink-0"
                          title={oculta ? "Exibir esta linha para o cliente" : "Ocultar esta linha do cliente"}
                        >
                          {oculta ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>
                  {ops.map((op) => (
                    <td
                      key={op.id}
                      className="px-4 py-3 text-foreground border-r border-border last:border-r-0 align-top"
                    >
                      {editMode ? (
                        <div className="space-y-1">
                          <div className="flex-1 min-w-0">{renderEditableCell(op, crit, updateDraftOperadora)}</div>
                          {crit.field === "coparticipacao" && <CoparticipacaoEditor op={op} onChange={updateDraftOperadora} />}
                        </div>
                      ) : (
                        crit.field === "faixas_etarias"
                          ? renderFaixasEtarias(op[crit.field as keyof typeof op] as string | null)
                          : crit.field === "coparticipacao"
                            ? renderCoparticipacao(op)
                            : renderCellValue(op[crit.field as keyof typeof op] as string | null)
                      )}
                    </td>
                  ))}
                  {editMode && <td className="bg-muted/30 border-l border-border w-12" />}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="text-primary-foreground bg-primary">
              <td className="px-4 py-4 font-bold uppercase tracking-wide text-sm border-r border-primary-foreground/10">
                Mensalidade Total
              </td>
              {ops.map((op, i) => {
                const grupoInfo = grupoSomaInfoById.get(op.id);
                const valorExibido = grupoInfo ? grupoInfo.total : totais[i];
                return (
                  <td key={op.id} className="px-4 py-4 font-bold text-lg border-r border-primary-foreground/10 last:border-r-0 align-top">
                    {editMode ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={op.valor_mensal ?? ""}
                        onChange={(e) =>
                          updateDraftOperadora(
                            op.id,
                            "valor_mensal",
                            e.target.value === "" ? null : parseFloat(e.target.value)
                          )
                        }
                        className="h-9 text-base text-foreground"
                        placeholder="0,00"
                      />
                    ) : (
                      <div>
                        {valorExibido !== null ? formatCurrency(valorExibido) : "—"}
                        {grupoInfo && (
                          <div className="text-[10px] font-normal opacity-80 mt-0.5 normal-case tracking-normal">
                            total do grupo
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
              {editMode && <td className="border-l border-primary-foreground/10 w-12 bg-primary" />}
            </tr>
            {!editMode && algum && ops.length > 1 && (
              <tr className="bg-accent/20">
                <td className="px-4 py-3 font-medium text-foreground border-r border-border">Economia vs. mais caro</td>
                {ops.map((op, i) => {
                  const grupoInfo = grupoSomaInfoById.get(op.id);
                  const t = grupoInfo ? grupoInfo.total : totais[i];
                  const economia = t !== null ? maior - t : 0;
                  return (
                    <td key={op.id} className="px-4 py-3 font-semibold text-foreground border-r border-border last:border-r-0">
                      {economia > 0 ? formatCurrency(economia) : "—"}
                    </td>
                  );
                })}
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  );
}
