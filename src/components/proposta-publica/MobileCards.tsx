import type { Operadora } from "@/lib/proposal-utils";
import { formatCurrency, DESTAQUE_LABELS, DESTAQUE_COLORS } from "@/lib/proposal-utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

import type { PropostaContext } from "./types";
import {
  headerClassFor,
  borderClassFor,
  renderCellValue,
  renderFaixasEtarias,
  renderCoparticipacao,
  renderEditableCell,
  OperadoraColorPicker,
  CoparticipacaoEditor,
} from "./shared";

export function MobileCards({ ctx }: { ctx: PropostaContext }) {
  const {
    editMode, grupos, grupoSomaInfoById, totalById,
    selectedPlans, toggleSelected,
    updateDraftOperadora, updateOperadoraColor,
    criteriosVisiveis, linhasOcultas, toggleLinhaOculta,
  } = ctx;

  return (
    <section className="container py-6 md:hidden space-y-6">
      {grupos.map((g) => (
        <div key={g.nome} className="space-y-3">
          <div className="flex items-center justify-between gap-2 border-b pb-1 flex-wrap">
            <h2 className="text-sm uppercase tracking-wider font-semibold text-muted-foreground">
              {g.nome}
            </h2>
            {editMode && <OperadoraColorPicker operadoraNome={g.nome} planos={g.planos} onPick={(nome, key) => updateOperadoraColor(nome, key)} />}
          </div>
          {g.planos.map((op) => {
            const grupoInfo = grupoSomaInfoById.get(op.id);
            const total = grupoInfo ? grupoInfo.total : (totalById.get(op.id) ?? null);
            const headerCls = headerClassFor(op);
            const borderCls = borderClassFor(op);
            return (
              <Card key={op.id} className={cn("overflow-hidden border-t-4", borderCls)}>
                <div className={cn("p-4", headerCls)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      {editMode ? (
                        <div className="space-y-1">
                          <Input value={op.operadora_nome ?? ""} onChange={(e) => updateDraftOperadora(op.id, "operadora_nome", e.target.value)} className="h-8 text-sm text-foreground" />
                          <Input value={op.plano_nome ?? ""} onChange={(e) => updateDraftOperadora(op.id, "plano_nome", e.target.value)} className="h-7 text-xs text-foreground" placeholder="Plano" />
                          <Input
                            value={op.grupo_soma ?? ""}
                            onChange={(e) => updateDraftOperadora(op.id, "grupo_soma", e.target.value)}
                            className="h-6 text-[10px] text-foreground bg-amber-50 border-amber-300"
                            placeholder='Grupo soma (admin)'
                          />
                        </div>
                      ) : (
                        <>
                          {op.plano_nome && <h3 className="font-bold text-lg leading-tight">{op.plano_nome}</h3>}
                          {grupoInfo && (() => {
                            const outros = grupoInfo.membros
                              .filter((m) => m.id !== op.id)
                              .map((m) => m.plano_nome || m.operadora_nome)
                              .filter(Boolean)
                              .join(" + ");
                            return (
                              <div className={cn("mt-2 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border", grupoInfo.cor)}>
                                <Plus className="w-2.5 h-2.5" />
                                Somado com: {outros || "outro plano"}
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                    {!editMode && (
                      <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                        <Checkbox
                          checked={selectedPlans.has(op.id)}
                          onCheckedChange={() => toggleSelected(op.id)}
                          className="h-4 w-4 border-white/60 data-[state=checked]:bg-white data-[state=checked]:text-primary"
                        />
                        Comparar
                      </label>
                    )}
                  </div>
                  {!editMode && op.destaque_comercial && DESTAQUE_LABELS[op.destaque_comercial] && (
                    <Badge className={`mt-2 text-[10px] ${DESTAQUE_COLORS[op.destaque_comercial]}`}>
                      {DESTAQUE_LABELS[op.destaque_comercial]}
                    </Badge>
                  )}
                  <div className="mt-3 pt-3 border-t border-white/20 -mx-4 -mb-4 px-4 pb-4">
                    <p className="text-xs opacity-80 uppercase tracking-wide">
                      Mensalidade Total{grupoInfo ? " (grupo)" : ""}
                    </p>
                    {editMode ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={op.valor_mensal ?? ""}
                        onChange={(e) =>
                          updateDraftOperadora(op.id, "valor_mensal", e.target.value === "" ? null : parseFloat(e.target.value))
                        }
                        className="h-9 text-base text-foreground mt-1"
                      />
                    ) : (
                      <p className="text-2xl font-bold">{total !== null ? formatCurrency(total) : "—"}</p>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-3 text-sm">
                  {criteriosVisiveis.map((crit) => {
                    const v = op[crit.field as keyof Operadora] as string | null;
                    if (!editMode && !v) return null;
                    const oculta = linhasOcultas.includes(crit.field as string);
                    return (
                      <div
                        key={crit.label}
                        className={cn(
                          "flex flex-col gap-1 pb-2 border-b last:border-b-0 -mx-2 px-2 rounded",
                          editMode && oculta && "opacity-60"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {crit.label}{editMode && oculta && <span className="ml-1 normal-case">(oculta)</span>}
                          </span>
                          {editMode && (
                            <button
                              type="button"
                              onClick={() => toggleLinhaOculta(crit.field as string)}
                              className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted shrink-0"
                              title={oculta ? "Exibir esta linha" : "Ocultar do cliente"}
                            >
                              {oculta ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                        <div className="text-foreground space-y-1">
                          {editMode ? (
                            <>
                              {renderEditableCell(op, crit, updateDraftOperadora)}
                              {crit.field === "coparticipacao" && <CoparticipacaoEditor op={op} onChange={updateDraftOperadora} />}
                            </>
                          ) : (
                            crit.field === "faixas_etarias"
                              ? renderFaixasEtarias(v)
                              : crit.field === "coparticipacao"
                                ? renderCoparticipacao(op)
                                : renderCellValue(v)
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      ))}
    </section>
  );
}
