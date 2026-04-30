import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lovable AI Gateway — modelos com prefixo "google/". Pro primeiro (precisão de tabela), depois flash como fallback.
const AI_MODELS = ["google/gemini-2.5-pro", "google/gemini-3-flash-preview", "google/gemini-2.5-flash"];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callAIWithFallback(apiKey: string, body: Record<string, unknown>) {
  let lastStatus = 500;
  let lastError = "Erro desconhecido na IA";
  for (const model of AI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, model }),
      });
      if (response.ok) return await response.json();
      lastStatus = response.status;
      lastError = await response.text();
      console.error(`AI gateway error (${model}, attempt ${attempt + 1}):`, response.status, lastError);
      // 402 (sem créditos) não adianta tentar outro modelo
      if (response.status === 402) {
        throw new Error("Créditos da IA esgotados. Adicione créditos em Settings → Workspace → Usage.");
      }
      if (![429, 500, 502, 503, 504].includes(response.status)) {
        // erro permanente neste modelo: tenta o próximo
        break;
      }
      await wait(700 * (attempt + 1));
    }
  }
  const transient = [429, 500, 502, 503, 504].includes(lastStatus);
  throw new Error(transient ? "Serviço de IA temporariamente indisponível. Tente novamente em alguns segundos." : `AI gateway error: ${lastStatus}`);
}

function parseToolArguments(raw: string) {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned);
}

function normalizeCurrencyValue(value: unknown, opts: { allowCentsHeuristic?: boolean } = {}) {
  if (value === null || value === undefined || value === "") return undefined;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^(não\s*incluso|n[aã]o\s*contemplado|n\/c|—|x|✗|✘)$/i.test(trimmed)) return -1;
    const cleaned = trimmed.replace(/[^\d,.-]/g, "");
    if (!cleaned) return undefined;
    if (cleaned === "-1") return -1;
    const normalized = cleaned.includes(",")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : /^\d{1,3}(\.\d{3})+$/.test(cleaned)
        ? cleaned.replace(/\./g, "")
        : cleaned;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value === -1) return -1;

  // Heurística de centavos colados (ex: 28512 -> 285.12) — APENAS para prêmio/franquia,
  // onde valores como R$ 50.000 são impossíveis. NUNCA aplicar em coberturas (danos, APP),
  // que legitimamente são 50000, 100000, 200000 etc.
  if (opts.allowCentsHeuristic && Number.isInteger(value) && value >= 10000 && value <= 999999) {
    return value / 100;
  }

  return value;
}

function normalizeExtractedData(data: any) {
  // Apenas estes podem ter "centavos colados" (ex: 28512 -> 285.12).
  const CENTS_HEURISTIC_FIELDS = new Set(["premio_total", "franquia_valor"]);
  const NUM_FIELDS = [
    "premio_total",
    "franquia_valor",
    "danos_materiais",
    "danos_corporais",
    "danos_morais",
    "app_morte_invalidez",
  ];
  const TXT_FIELDS = [
    "cobertura_resumo",
    "franquia_tipo",
    "percentual_fipe",
    "assistencia_24h",
    "vidros",
    "carro_reserva",
  ];
  const isNegMark = (s: string) =>
    /^(x|—|✗|✘|não|nao|n\/c|não\s*contemplado|nao\s*contemplado)$/i.test(s.trim());

  return {
    ...data,
    cotacoes: Array.isArray(data?.cotacoes)
      ? data.cotacoes.map((cotacao: any) => {
          const out: any = { ...cotacao };
          for (const f of NUM_FIELDS) {
            if (f in out) out[f] = normalizeCurrencyValue(out[f], { allowCentsHeuristic: CENTS_HEURISTIC_FIELDS.has(f) });
          }
          for (const f of TXT_FIELDS) {
            const v = out[f];
            if (typeof v === "string" && isNegMark(v)) out[f] = "Não incluso";
          }
          return out;
        })
      : [],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { pdf_base64 } = await req.json();
    if (!pdf_base64) {
      return new Response(JSON.stringify({ error: "pdf_base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const result = await callAIWithFallback(LOVABLE_API_KEY, {
      messages: [
        {
          role: "system",
          content: `Você é um especialista SÊNIOR em extrair dados de PDFs de cotações de SEGURO DE AUTOMÓVEL no Brasil (Segfy, Mapfre, Porto, Suhai, Zurich, Allianz, HDI, Tokio Marine, Itaú, Liberty, Bradesco Auto, Sompo, Azul, etc.). Leia o PDF inteiro de forma minuciosa: capa, tabelas comparativas, rodapés, observações e letras pequenas.

═══════════════════════════════════════
REGRA #1 — UM PDF, MÚLTIPLAS COTAÇÕES (SEGURADORAS)
═══════════════════════════════════════
Um PDF de cotação de auto normalmente compara VÁRIAS seguradoras lado a lado em uma tabela (cada coluna = uma seguradora/produto). Extraia TODAS as colunas como itens separados em 'cotacoes[]'. Algumas colunas podem ser de produtos parciais (ex: "Proteção para Vidros" da Ituran, "Roubo/Furto" da Suhai) — extraia também, são opções válidas.

═══════════════════════════════════════
REGRA #1.1 — ALINHAMENTO POR COLUNA (CRÍTICO — NÃO EMBARALHE DADOS)
═══════════════════════════════════════
**ESTE É O ERRO MAIS GRAVE QUE VOCÊ PODE COMETER.** Cada valor pertence à coluna (seguradora) imediatamente acima dele na MESMA coordenada horizontal (X). NUNCA pegue um valor de uma coluna e coloque em outra.

PROCESSO OBRIGATÓRIO antes de gerar a saída:
1. Identifique o cabeçalho da tabela comparativa: liste mentalmente os nomes das seguradoras na ORDEM EXATA da esquerda para a direita (ex: ["Porto", "Mapfre", "Suhai", "Allianz"]).
2. Para CADA linha (critério: Prêmio, Franquia, Danos Materiais, Vidros, etc.), leia os valores da esquerda para a direita e associe POSIÇÃO 1 → seguradora 1, POSIÇÃO 2 → seguradora 2, e assim por diante. NÃO pule, NÃO inverta, NÃO copie um valor para outra coluna.
3. Se uma célula está VAZIA / "X" / "—" naquela posição, registre como "Não incluso" (texto) ou -1 (numérico) — NUNCA pegue o valor da coluna ao lado para preencher.
4. A ordem do array 'cotacoes[]' DEVE seguir a mesma ordem das colunas no PDF (esquerda → direita).
5. Antes de finalizar, VERIFIQUE coluna por coluna: o prêmio da Mapfre é o que está abaixo do cabeçalho "Mapfre"? A franquia da Suhai é a que está abaixo de "Suhai"? Se houver dúvida, prefira OMITIR o campo a chutar.

PROIBIDO:
- Copiar o mesmo valor para múltiplas seguradoras "porque parece igual".
- Usar o valor de uma coluna vizinha quando uma célula está vazia.
- Reordenar as cotações por preço, alfabeto ou qualquer outro critério.

═══════════════════════════════════════
REGRA #2 — DADOS DO CLIENTE/VEÍCULO/COTAÇÃO
═══════════════════════════════════════
Extraia:
- 'cliente_nome': nome do segurado
- 'veiculo_marca_modelo': marca/modelo do veículo
- 'tipo_cotacao': use EXATAMENTE um destes códigos quando identificável no PDF:
   • "novo" — seguro novo / primeira contratação
   • "renovacao_congenere" — renovação vinda de outra seguradora (congênere)
   • "renovacao_mesma" — renovação na MESMA seguradora atual
- 'vigencia_inicio' e 'vigencia_fim': datas de início e fim da vigência no formato ISO YYYY-MM-DD (converta de DD/MM/AAAA).
- 'cep_pernoite': CEP do local de pernoite do veículo (formato 00000-000 se disponível).
- 'condutor_18_26': boolean true/false — true se o PDF indicar condutor (principal ou eventual) com idade entre 18 e 26 anos. Se não houver menção, omita.
Ignore demais dados (vigência detalhada do condutor adicional, etc.).

═══════════════════════════════════════
REGRA #3 — VALORES NUMÉRICOS (CRÍTICO — FORMATO BR)
═══════════════════════════════════════
**ATENÇÃO MÁXIMA AO FORMATO DECIMAL BRASILEIRO**: no Brasil usa-se VÍRGULA como separador decimal e PONTO como separador de milhar.
- "R$ 4.154,35" → enviar 4154.35 (NÃO 415435, NÃO 4.15435)
- "R$ 182,13" → enviar 182.13 (NÃO 18213)
- "R$ 50.000,00" → enviar 50000
- "R$ 1.281,24" → enviar 1281.24
- "R$ 10.047,82" → enviar 10047.82

REGRA DE OURO: a vírgula brasileira SEMPRE indica os centavos. NUNCA envie um valor monetário como inteiro quando o PDF mostra ",XX" no fim — divida mentalmente por 100 se necessário, mas NUNCA inclua os centavos como parte da parte inteira.

Campos numéricos ('premio_total', 'franquia_valor', 'danos_materiais', 'danos_corporais', 'danos_morais', 'app_morte_invalidez'): número decimal limpo, sem R$, sem pontos de milhar.
'parcelamento': STRING tal como aparece no PDF (ex: "10x de R$ 415,39").

═══════════════════════════════════════
REGRA #4 — CAMPOS DE TEXTO
═══════════════════════════════════════
- 'seguradora_nome': nome canônico (Mapfre, Porto Seguro, Zurich, Suhai, Ituran, Allianz, HDI, Tokio Marine, Bradesco Auto, Liberty, Sompo, Azul Seguros, Itaú).
- 'produto_nome', 'cobertura_resumo', 'franquia_tipo', 'assistencia_24h', 'formas_pagamento': descrição curta como aparece.
- 'percentual_fipe': "100%", "0%" ou "Valor determinado: R$ X" — exatamente como no PDF.

═══════════════════════════════════════
REGRA #4.1 — FORMAS DE PAGAMENTO ESTRUTURADAS (IMPORTANTE)
═══════════════════════════════════════
Além do campo 'formas_pagamento' (texto livre), preencha SEMPRE 'formas_pagamento_detalhes' como um ARRAY de objetos { tipo, descricao } com TODAS as opções listadas no PDF para aquela cotação.

- 'tipo' deve ser EXATAMENTE um destes valores: "Cartão de crédito", "Cartão de débito", "Boleto", "Débito em conta", "PIX", "Dinheiro", "Transferência".
- 'descricao' = condição da opção, ex.: "até 10x sem juros", "à vista com 5% desconto", "1+9 sem juros", "1+5 boletos", "1+3 PIX".

Exemplos:
- PDF: "Cartão de crédito em até 10x sem juros • Boleto à vista" →
  [{"tipo":"Cartão de crédito","descricao":"até 10x sem juros"},{"tipo":"Boleto","descricao":"à vista"}]
- PDF: "1+9 no cartão / 1+3 boleto" →
  [{"tipo":"Cartão de crédito","descricao":"1+9"},{"tipo":"Boleto","descricao":"1+3"}]

Se o PDF não tem nenhuma opção explícita, OMITA 'formas_pagamento_detalhes'.

═══════════════════════════════════════
REGRA #5 — MARCADORES "X" / NEGAÇÃO (CRÍTICO)
═══════════════════════════════════════
Em tabelas comparativas é MUITO comum que uma célula contenha "X", "—", "✗", "✘", "Não", "N/C", "Não contratado", "Não incluso", "Não contemplado" ou esteja em branco indicando que aquela cobertura/benefício NÃO está incluída naquele produto. Esses marcadores aparecem em QUALQUER campo (texto OU numérico — inclusive franquia, danos materiais, danos corporais, danos morais, APP, vidros, carro reserva, assistência, cobertura, etc.).

REGRAS DE PREENCHIMENTO:
- Para campos de TEXTO (cobertura_resumo, franquia_tipo, percentual_fipe, assistencia_24h, vidros, carro_reserva): envie EXATAMENTE a string "Não incluso".
- Para campos NUMÉRICOS (premio_total, franquia_valor, danos_materiais, danos_corporais, danos_morais, app_morte_invalidez): envie o número especial -1 para indicar "Não incluso". NUNCA envie 0 (zero é um valor real). NUNCA omita o campo nesse caso — use -1.
- Só omita o campo quando ele genuinamente NÃO existe na tabela / não há linha para ele naquela seguradora.
- NUNCA escreva "Não contemplado", "N/C", "—" — sempre "Não incluso" (texto) ou -1 (numérico).

═══════════════════════════════════════
REGRA #6 — HONESTIDADE
═══════════════════════════════════════
NUNCA invente. Se não aparece no PDF, omita (numérico) ou deixe vazio (texto).`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extraia os dados deste PDF de cotação de seguro de AUTOMÓVEL usando a função extract_auto_quotes. Cada coluna/seguradora vira um item em 'cotacoes[]'.",
            },
            {
              type: "image_url",
              image_url: { url: `data:application/pdf;base64,${pdf_base64}` },
            },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_auto_quotes",
            description: "Extrai dados estruturados de um PDF de cotação de seguro de automóvel, com múltiplas seguradoras",
            parameters: {
              type: "object",
              properties: {
                cliente_nome: { type: "string", description: "Nome do segurado conforme aparece no PDF" },
                veiculo_marca_modelo: { type: "string", description: "Marca e modelo do veículo (ex: 'BYD/Dolphin Mini (Elétrico)', 'VW/Polo Highline')" },
                tipo_cotacao: {
                  type: "string",
                  enum: ["novo", "renovacao_congenere", "renovacao_mesma"],
                  description: "Tipo da cotação: novo, renovação congênere ou renovação na mesma seguradora",
                },
                vigencia_inicio: { type: "string", description: "Início de vigência (YYYY-MM-DD)" },
                vigencia_fim: { type: "string", description: "Fim de vigência (YYYY-MM-DD)" },
                cep_pernoite: { type: "string", description: "CEP do local de pernoite do veículo" },
                condutor_18_26: { type: "boolean", description: "True se houver condutor entre 18 e 26 anos" },
                cotacoes: {
                  type: "array",
                  description: "Array com TODAS as cotações/seguradoras encontradas no PDF (cada coluna da tabela comparativa).",
                  items: {
                    type: "object",
                    properties: {
                      seguradora_nome: { type: "string", description: "Nome canônico da seguradora" },
                      produto_nome: { type: "string", description: "Nome do produto/plano" },
                      premio_total: { type: "number", description: "Valor do seguro (prêmio total) em R$, apenas número" },
                      cobertura_resumo: { type: "string", description: "Resumo da cobertura principal" },
                      franquia_valor: { type: "number", description: "Valor da franquia em R$, apenas número" },
                      franquia_tipo: { type: "string", description: "Tipo da franquia (Reduzida 50%, Normal, etc.)" },
                      percentual_fipe: { type: "string", description: "Percentual FIPE ou valor determinado" },
                      danos_materiais: { type: "number", description: "Danos a terceiros materiais (R$)" },
                      danos_corporais: { type: "number", description: "Danos a terceiros corporais (R$)" },
                      danos_morais: { type: "number", description: "Danos morais (R$)" },
                      app_morte_invalidez: { type: "number", description: "APP Morte/Invalidez (R$)" },
                      assistencia_24h: { type: "string", description: "Resumo da assistência 24h" },
                      vidros: { type: "string", description: "Cobertura de vidros (Sim/Não contemplado/descrição)" },
                      carro_reserva: { type: "string", description: "Carro reserva (Sim/Não contemplado/descrição)" },
                      parcelamento: { type: "string", description: "Parcelamento (ex: '10x de R$ 415,39')" },
                      formas_pagamento: { type: "string", description: "Resumo em texto livre das formas de pagamento" },
                      formas_pagamento_detalhes: {
                        type: "array",
                        description: "Lista estruturada das opções de pagamento aceitas. Cada item = { tipo, descricao }.",
                        items: {
                          type: "object",
                          properties: {
                            tipo: {
                              type: "string",
                              enum: ["Cartão de crédito", "Cartão de débito", "Boleto", "Débito em conta", "PIX", "Dinheiro", "Transferência"],
                              description: "Tipo da forma de pagamento (canônico)",
                            },
                            descricao: {
                              type: "string",
                              description: "Condição/parcelamento (ex.: 'até 10x sem juros', '1+9', 'à vista')",
                            },
                          },
                          required: ["tipo"],
                        },
                      },
                    },
                    required: ["seguradora_nome"],
                  },
                },
              },
              required: ["cotacoes"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_auto_quotes" } },
    });

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("A IA não retornou dados estruturados.");
    }

    const data = normalizeExtractedData(parseToolArguments(toolCall.function.arguments));
    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("extract-auto-pdf error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
