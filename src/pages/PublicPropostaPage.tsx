import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Proposta,
  Operadora,
  formatCurrency,
  formatPhone,
  DESTAQUE_LABELS,
  DESTAQUE_COLORS,
  parseFaixasEtarias,
  parseIdades,
  calcularTotalPorFaixas,
} from "@/lib/proposal-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Shield, MessageCircle, FileText, MapPin, Calendar, Heart } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PublicPropostaPage() {
  const { slug } = useParams();
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadProposta();
  }, [slug]);

  const loadProposta = async () => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const { data: prop } = await supabase.from("propostas").select("*").eq("slug", slug).single();
    if (!prop) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setProposta(prop);

    const { data: ops } = await supabase
      .from("proposta_operadoras")
      .select("*")
      .eq("proposta_id", prop.id)
      .order("ordem_exibicao");
    setOperadoras(ops || []);
    setLoading(false);
  };

  const whatsappLink = (message: string) => {
    if (!proposta?.consultora_telefone) return "#";
    const phone = formatPhone(proposta.consultora_telefone);
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const generalWhatsapp = () =>
    whatsappLink("Olá! Vi minha proposta e gostaria de falar sobre as opções apresentadas.");

  // Calcula o total mensal de uma operadora (usa valor_mensal ou faixas etárias)
  const getTotalMensal = (op: Operadora): number | null => {
    const faixasRaw = (op as any).faixas_etarias as string | null;
    const idadesRaw = (proposta as any)?.idades_beneficiarios as string | null;
    if (faixasRaw && idadesRaw) {
      const faixas = parseFaixasEtarias(faixasRaw);
      const idades = parseIdades(idadesRaw);
      if (faixas.length > 0 && idades.length > 0) {
        return calcularTotalPorFaixas(idades, faixas).total;
      }
    }
    return op.valor_mensal ?? null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-lg">Carregando sua proposta...</div>
      </div>
    );
  }

  if (notFound || !proposta) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <Shield className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Proposta não encontrada</h1>
        <p className="text-muted-foreground">O link pode estar incorreto ou a proposta não está mais disponível.</p>
      </div>
    );
  }

  // Pré-calcula totais e a maior mensalidade (para a linha de economia)
  const totais = operadoras.map((op) => getTotalMensal(op));
  const maiorTotal = Math.max(...totais.filter((t): t is number => t !== null), 0);
  const algumComTotal = totais.some((t) => t !== null);

  // Define as linhas de critério da tabela comparativa
  const criterios: { label: string; value: (op: Operadora) => string | null | undefined }[] = [
    { label: "Coparticipação", value: (op) => op.coparticipacao },
    { label: "Acomodação", value: (op) => op.acomodacao },
    { label: "Abrangência", value: (op) => op.abrangencia },
    { label: "Reembolso", value: (op) => op.reembolso },
    { label: "Cobertura", value: (op) => op.resumo_cobertura },
    { label: "Rede credenciada", value: (op) => op.rede_credenciada_resumo },
  ];

  const renderCellValue = (val: string | null | undefined) => {
    if (!val || !val.trim()) return <span className="text-muted-foreground">—</span>;
    // Para listas (rede credenciada), quebra em linhas
    if (val.includes("\n") || val.split(/[,;]/).length > 2) {
      const items = val
        .split(/[\n,;]+/)
        .map((s) => s.replace(/^[-•*\d.)\s]+/, "").trim())
        .filter((s) => s.length > 1)
        .slice(0, 5);
      return (
        <ul className="text-xs space-y-1 text-left">
          {items.map((s, i) => (
            <li key={i}>• {s}</li>
          ))}
        </ul>
      );
    }
    return <span className="whitespace-pre-line">{val}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="gradient-hero text-primary-foreground">
        <div className="container py-8 md:py-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-white/10 backdrop-blur flex items-center justify-center mb-2">
            <Shield className="w-7 h-7" />
          </div>
          <p className="text-xs uppercase tracking-widest opacity-80">Estudo Personalizado</p>
          <h1 className="text-2xl md:text-4xl font-bold">Comparativo de Planos — Todas as Opções</h1>
          <p className="text-base md:text-lg opacity-90 max-w-xl mx-auto">
            Olá, <span className="font-semibold">{proposta.nome_cliente}</span>! Confira lado a lado as melhores opções
            para o seu perfil.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm opacity-80 pt-2">
            {proposta.cidade && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {proposta.cidade}
                {proposta.estado ? ` - ${proposta.estado}` : ""}
              </span>
            )}
            {proposta.validade_proposta && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Válida até {format(new Date(proposta.validade_proposta), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            )}
            {proposta.tipo_produto && (
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {proposta.tipo_produto}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ====== TABELA COMPARATIVA (desktop/tablet) ====== */}
      <section className="container py-8 md:py-10 hidden md:block">
        <div className="rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="text-left px-4 py-4 font-semibold w-56 align-top border-r border-primary-foreground/10">
                    Critério
                  </th>
                  {operadoras.map((op) => (
                    <th
                      key={op.id}
                      className="text-left px-4 py-4 font-semibold align-top border-r border-primary-foreground/10 last:border-r-0 min-w-[180px]"
                    >
                      <div className="space-y-1">
                        <div className="text-base leading-tight">{op.operadora_nome}</div>
                        {op.plano_nome && (
                          <div className="text-xs font-normal opacity-90">{op.plano_nome}</div>
                        )}
                        {op.destaque_comercial && DESTAQUE_LABELS[op.destaque_comercial] && (
                          <Badge
                            className={`mt-2 text-[10px] px-2 py-0.5 ${DESTAQUE_COLORS[op.destaque_comercial]}`}
                          >
                            {DESTAQUE_LABELS[op.destaque_comercial]}
                          </Badge>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {criterios.map((crit, rowIdx) => (
                  <tr
                    key={crit.label}
                    className={rowIdx % 2 === 0 ? "bg-background" : "bg-muted/40"}
                  >
                    <td className="px-4 py-3 font-medium text-foreground border-r border-border align-top">
                      {crit.label}
                    </td>
                    {operadoras.map((op) => (
                      <td
                        key={op.id}
                        className="px-4 py-3 text-foreground border-r border-border last:border-r-0 align-top"
                      >
                        {renderCellValue(crit.value(op))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* Mensalidade Total — linha de destaque */}
                {algumComTotal && (
                  <tr className="bg-primary text-primary-foreground">
                    <td className="px-4 py-4 font-bold uppercase tracking-wide text-sm border-r border-primary-foreground/10">
                      Mensalidade Total
                    </td>
                    {operadoras.map((op, i) => (
                      <td
                        key={op.id}
                        className="px-4 py-4 font-bold text-lg border-r border-primary-foreground/10 last:border-r-0"
                      >
                        {totais[i] !== null ? formatCurrency(totais[i]) : "—"}
                      </td>
                    ))}
                  </tr>
                )}
                {/* Economia */}
                {algumComTotal && operadoras.length > 1 && (
                  <tr className="bg-accent/20">
                    <td className="px-4 py-3 font-medium text-foreground border-r border-border">
                      Economia vs. mais caro
                    </td>
                    {operadoras.map((op, i) => {
                      const t = totais[i];
                      const economia = t !== null ? maiorTotal - t : 0;
                      return (
                        <td
                          key={op.id}
                          className="px-4 py-3 font-semibold text-foreground border-r border-border last:border-r-0"
                        >
                          {economia > 0 ? formatCurrency(economia) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                )}
                {/* PDFs */}
                {operadoras.some((op) => op.pdf_url) && (
                  <tr className="bg-muted/30">
                    <td className="px-4 py-3 text-xs text-muted-foreground border-r border-border">
                      Material da operadora
                    </td>
                    {operadoras.map((op) => (
                      <td
                        key={op.id}
                        className="px-4 py-3 text-xs border-r border-border last:border-r-0"
                      >
                        {op.pdf_url ? (
                          <a
                            href={op.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Ver PDF
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* ====== CARDS EMPILHADOS (mobile) ====== */}
      <section className="container py-6 md:hidden space-y-4">
        {operadoras.map((op, i) => {
          const total = totais[i];
          return (
            <Card key={op.id} className="overflow-hidden">
              <div className="bg-primary text-primary-foreground p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold">{op.operadora_nome}</h3>
                    {op.plano_nome && <p className="text-xs opacity-90">{op.plano_nome}</p>}
                  </div>
                  {op.destaque_comercial && DESTAQUE_LABELS[op.destaque_comercial] && (
                    <Badge className={`text-[10px] ${DESTAQUE_COLORS[op.destaque_comercial]}`}>
                      {DESTAQUE_LABELS[op.destaque_comercial]}
                    </Badge>
                  )}
                </div>
                {total !== null && (
                  <div className="mt-3 pt-3 border-t border-primary-foreground/20">
                    <p className="text-xs opacity-80 uppercase tracking-wide">Mensalidade Total</p>
                    <p className="text-2xl font-bold">{formatCurrency(total)}</p>
                  </div>
                )}
              </div>
              <div className="p-4 space-y-3 text-sm">
                {criterios.map((crit) => {
                  const v = crit.value(op);
                  if (!v) return null;
                  return (
                    <div key={crit.label} className="flex flex-col gap-1 pb-2 border-b last:border-b-0">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {crit.label}
                      </span>
                      <div className="text-foreground">{renderCellValue(v)}</div>
                    </div>
                  );
                })}
                {op.pdf_url && (
                  <a href={op.pdf_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      <FileText className="w-4 h-4 mr-2" />
                      Ver PDF da Operadora
                    </Button>
                  </a>
                )}
              </div>
            </Card>
          );
        })}
      </section>

      {/* ====== Detalhamento por beneficiário e faixas etárias (accordion) ====== */}
      {operadoras.some((op) => (op as any).faixas_etarias) && (
        <section className="container pb-8">
          <h2 className="text-lg md:text-xl font-bold mb-3">Detalhamento de Faixas Etárias e Reajustes</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {operadoras
              .filter((op) => (op as any).faixas_etarias)
              .map((op) => {
                const faixas = parseFaixasEtarias((op as any).faixas_etarias);
                const idades = parseIdades((proposta as any).idades_beneficiarios);
                const temCalculo = faixas.length > 0 && idades.length > 0;
                const resultado = temCalculo ? calcularTotalPorFaixas(idades, faixas) : null;

                return (
                  <AccordionItem
                    key={op.id}
                    value={op.id}
                    className="border rounded-lg px-4 bg-card"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex flex-col items-start text-left">
                        <span className="font-semibold">{op.operadora_nome}</span>
                        {op.plano_nome && (
                          <span className="text-xs text-muted-foreground">{op.plano_nome}</span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      {resultado && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">
                            Detalhamento por Beneficiário
                          </p>
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-muted/50">
                                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                    Beneficiário
                                  </th>
                                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Idade</th>
                                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Faixa</th>
                                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {resultado.detalhes.map((d, i) => (
                                  <tr key={i} className="border-t">
                                    <td className="px-3 py-2 text-foreground">Beneficiário {i + 1}</td>
                                    <td className="px-3 py-2 text-foreground">{d.idade} anos</td>
                                    <td className="px-3 py-2 text-foreground">{d.faixa}</td>
                                    <td className="px-3 py-2 text-right font-medium text-foreground">
                                      {formatCurrency(d.valor)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t bg-muted/30">
                                  <td colSpan={3} className="px-3 py-2 font-bold text-foreground">
                                    Total Mensal
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-primary text-base">
                                    {formatCurrency(resultado.total)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Tabela de Faixas Etárias</p>
                        <div className="text-sm text-foreground whitespace-pre-line">
                          {(op as any).faixas_etarias}
                        </div>
                      </div>

                      {(op as any).previsao_reajuste_faixa && (
                        <div className="pt-3 border-t">
                          <p className="text-sm font-medium text-muted-foreground mb-1">Previsão de Reajuste</p>
                          <p className="text-sm text-foreground">{(op as any).previsao_reajuste_faixa}</p>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
          </Accordion>
        </section>
      )}

      {/* Observações */}
      {proposta.observacoes_gerais && (
        <section className="container pb-8">
          <Card className="p-6 bg-muted/50">
            <p className="text-sm text-muted-foreground font-medium mb-1">Observações</p>
            <p className="text-foreground whitespace-pre-line">{proposta.observacoes_gerais}</p>
          </Card>
        </section>
      )}

      {/* Consultora */}
      {proposta.consultora_nome && (
        <section className="container pb-12">
          <Card className="p-6 md:p-8 text-center max-w-lg mx-auto">
            {proposta.consultora_foto_url && (
              <img
                src={proposta.consultora_foto_url}
                alt={proposta.consultora_nome}
                className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-4 border-accent/20"
              />
            )}
            <h3 className="text-lg font-bold text-foreground">{proposta.consultora_nome}</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Sua consultora está disponível para esclarecer dúvidas e ajudar na melhor escolha.
            </p>
            <a href={generalWhatsapp()} target="_blank" rel="noopener noreferrer">
              <Button variant="whatsapp" size="lg">
                <MessageCircle className="w-5 h-5 mr-2" />
                Falar com {proposta.consultora_nome} no WhatsApp
              </Button>
            </a>
          </Card>
        </section>
      )}

      {/* Botão fixo WhatsApp */}
      {proposta.consultora_telefone && (
        <a href={generalWhatsapp()} target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-50">
          <Button variant="whatsapp" size="lg" className="rounded-full shadow-xl h-14 px-6 text-base">
            <MessageCircle className="w-5 h-5 mr-2" />
            Falar no WhatsApp
          </Button>
        </a>
      )}

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>Proposta preparada com ❤️ pela sua corretora de confiança</p>
      </footer>
    </div>
  );
}
