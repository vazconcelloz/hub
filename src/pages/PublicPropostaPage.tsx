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
import { Shield, MessageCircle, FileText, CheckCircle, MapPin, Calendar, Heart } from "lucide-react";
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
  const operadoraWhatsapp = (nome: string) =>
    whatsappLink(`Olá! Vi minha proposta e quero falar sobre a opção da operadora ${nome}.`);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="gradient-hero text-primary-foreground">
        <div className="container py-10 md:py-16 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-xl bg-white/10 backdrop-blur flex items-center justify-center mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <p className="text-sm uppercase tracking-widest opacity-80">Estudo Personalizado</p>
          <h1 className="text-3xl md:text-4xl font-bold">O seu estudo está pronto!</h1>
          <p className="text-lg opacity-90 max-w-xl mx-auto">
            Olá, <span className="font-semibold">{proposta.nome_cliente}</span>! Preparamos uma proposta personalizada
            com as melhores opções para você.
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

      {/* Operadoras */}
      <section className="container py-8 md:py-12">
        <h2 className="text-xl md:text-2xl font-bold text-center mb-2">Compare as opções disponíveis</h2>
        <p className="text-muted-foreground text-center mb-8 max-w-lg mx-auto">
          Analisamos as principais operadoras e selecionamos as melhores opções para o seu perfil.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {operadoras.map((op, idx) => (
            <Card
              key={op.id}
              className="relative overflow-hidden hover:shadow-premium transition-all duration-300 flex flex-col"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Badge */}
              {op.destaque_comercial && DESTAQUE_LABELS[op.destaque_comercial] && (
                <div className="absolute top-0 right-0">
                  <Badge
                    className={`rounded-none rounded-bl-lg px-3 py-1 text-xs font-semibold ${DESTAQUE_COLORS[op.destaque_comercial]}`}
                  >
                    {DESTAQUE_LABELS[op.destaque_comercial]}
                  </Badge>
                </div>
              )}

              <div className="p-6 flex-1 flex flex-col">
                {/* Header */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-foreground">{op.operadora_nome}</h3>
                  {op.plano_nome && <p className="text-sm text-muted-foreground">{op.plano_nome}</p>}
                </div>

                {/* Price */}
                {op.valor_mensal && (
                  <div className="mb-5 pb-4 border-b">
                    <p className="text-sm text-muted-foreground">Valor mensal</p>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(op.valor_mensal)}</p>
                  </div>
                )}

                {/* Details */}
                <div className="space-y-3 text-sm flex-1">
                  {op.coparticipacao && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coparticipação</span>
                      <span className="font-medium text-foreground text-right">{op.coparticipacao}</span>
                    </div>
                  )}
                  {op.acomodacao && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Acomodação</span>
                      <span className="font-medium text-foreground text-right">{op.acomodacao}</span>
                    </div>
                  )}
                  {op.abrangencia && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Abrangência</span>
                      <span className="font-medium text-foreground text-right">{op.abrangencia}</span>
                    </div>
                  )}
                  {op.reembolso && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reembolso</span>
                      <span className="font-medium text-foreground text-right">{op.reembolso}</span>
                    </div>
                  )}
                  {op.resumo_cobertura && (
                    <div className="pt-2 border-t">
                      <p className="text-muted-foreground text-xs mb-1">Cobertura</p>
                      <p className="text-foreground">{op.resumo_cobertura}</p>
                    </div>
                  )}
                  {op.rede_credenciada_resumo && (
                    <div className="pt-2 border-t">
                      <p className="text-muted-foreground text-xs mb-2">Rede Credenciada</p>
                      <ul className="space-y-1.5">
                        {op.rede_credenciada_resumo
                          .split(/[\n,;]+/)
                          .map((h) => h.replace(/^[-•*\d.)\s]+/, "").trim())
                          .filter((h) => h.length > 2)
                          .slice(0, 5)
                          .map((hospital, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                              <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <span>{hospital}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-5">
                  {op.pdf_url && (
                    <a href={op.pdf_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="w-full" size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Ver PDF da Operadora
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Faixas Etárias e Reajustes */}
      {operadoras.some((op) => (op as any).faixas_etarias) && (
        <section className="container pb-8">
          <h2 className="text-xl font-bold mb-4">Faixas Etárias e Reajustes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {operadoras
              .filter((op) => (op as any).faixas_etarias)
              .map((op) => {
                const faixas = parseFaixasEtarias((op as any).faixas_etarias);
                const idades = parseIdades((proposta as any).idades_beneficiarios);
                const temCalculo = faixas.length > 0 && idades.length > 0;
                const resultado = temCalculo ? calcularTotalPorFaixas(idades, faixas) : null;

                return (
                  <Card key={op.id} className="p-6">
                    <h3 className="font-bold text-foreground mb-3">{op.operadora_nome}</h3>
                    {op.plano_nome && <p className="text-sm text-muted-foreground mb-3">{op.plano_nome}</p>}
                    <div className="space-y-3">
                      {/* Tabela de detalhamento por beneficiário */}
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

                      {/* Faixas completas */}
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Tabela de Faixas Etárias</p>
                        <div className="text-sm text-foreground whitespace-pre-line">{(op as any).faixas_etarias}</div>
                      </div>

                      {(op as any).previsao_reajuste_faixa && (
                        <div className="pt-3 border-t">
                          <p className="text-sm font-medium text-muted-foreground mb-1">Previsão de Reajuste</p>
                          <p className="text-sm text-foreground">{(op as any).previsao_reajuste_faixa}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
          </div>
        </section>
      )}

      {/* Observations */}
      {proposta.observacoes_gerais && (
        <section className="container pb-8">
          <Card className="p-6 bg-muted/50">
            <p className="text-sm text-muted-foreground font-medium mb-1">Observações</p>
            <p className="text-foreground">{proposta.observacoes_gerais}</p>
          </Card>
        </section>
      )}

      {/* Consultant section */}
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

      {/* Fixed WhatsApp Button */}
      {proposta.consultora_telefone && (
        <a href={generalWhatsapp()} target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-50">
          <Button variant="whatsapp" size="lg" className="rounded-full shadow-xl h-14 px-6 text-base">
            <MessageCircle className="w-5 h-5 mr-2" />
            Falar no WhatsApp
          </Button>
        </a>
      )}

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>Proposta preparada com ❤️ pela sua corretora de confiança</p>
      </footer>
    </div>
  );
}
