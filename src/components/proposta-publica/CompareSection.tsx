import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Scale, MessageCircle } from "lucide-react";

import type { PropostaContext } from "./types";
import { ComparativeTable } from "./ComparativeTable";

export function CompareBar({ ctx }: { ctx: PropostaContext }) {
  const { editMode, selectedPlans, setSelectedPlans, setCompareOpen } = ctx;

  if (editMode || selectedPlans.size === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t shadow-2xl">
      <div className="container py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Scale className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">
            {selectedPlans.size} plano{selectedPlans.size > 1 ? "s" : ""} selecionado{selectedPlans.size > 1 ? "s" : ""}
          </span>
          {selectedPlans.size > 4 && (
            <span className="text-xs text-muted-foreground hidden sm:inline">(muitos planos podem dificultar a leitura em telas pequenas)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedPlans(new Set())}>Limpar</Button>
          <Button size="sm" disabled={selectedPlans.size < 2} onClick={() => setCompareOpen(true)}>
            <Scale className="w-4 h-4 mr-1.5" />
            Comparar agora
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CompareDialog({ ctx }: { ctx: PropostaContext }) {
  const { proposta, viewOps, selectedPlans, compareOpen, setCompareOpen, whatsappLink } = ctx;

  const sel = viewOps.filter((op) => selectedPlans.has(op.id));
  const lista = sel.map((op) => `• ${op.operadora_nome}${op.plano_nome ? " — " + op.plano_nome : ""}`).join("\n");
  const compareWhatsapp = whatsappLink(`Olá! Gostaria de tirar dúvidas sobre estes planos:\n${lista}`);

  return (
    <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
      <DialogContent className="max-w-[95vw] md:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Comparação de planos selecionados
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <ComparativeTable ctx={ctx} ops={sel} showOperadoraInHeader />
          {proposta.consultora_telefone && (
            <div className="flex justify-center pt-2">
              <a href={compareWhatsapp} target="_blank" rel="noopener noreferrer">
                <Button variant="whatsapp" size="lg">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Falar com a consultora sobre estes planos
                </Button>
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
