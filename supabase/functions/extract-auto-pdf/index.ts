import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_MODELS = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGeminiWithFallback(apiKey: string, body: Record<string, unknown>) {
  let lastStatus = 500;
  let lastError = "Erro desconhecido na IA";
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, model }),
      });
      if (response.ok) return await response.json();
      lastStatus = response.status;
      lastError = await response.text();
      console.error(`Gemini auto error (${model}, attempt ${attempt + 1}):`, response.status, lastError);
      if (![429, 500, 502, 503, 504].includes(response.status)) {
        throw new Error(`AI gateway error: ${response.status}`);
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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const result = await callGeminiWithFallback(GEMINI_API_KEY, {
      messages: [
        {
          role: "system",
          content: `Você é um especialista SÊNIOR em extrair dados de PDFs de cotações de SEGURO DE AUTOMÓVEL no Brasil (Segfy, Mapfre, Porto, Suhai, Zurich, Allianz, HDI, Tokio Marine, Itaú, Liberty, Bradesco Auto, Sompo, Azul, etc.). Leia o PDF inteiro de forma minuciosa: capa, tabelas comparativas, rodapés, observações e letras pequenas.

═══════════════════════════════════════
REGRA #1 — UM PDF, MÚLTIPLAS COTAÇÕES (SEGURADORAS)
═══════════════════════════════════════
Um PDF de cotação de auto normalmente compara VÁRIAS seguradoras lado a lado em uma tabela (cada coluna = uma seguradora/produto). Extraia TODAS as colunas como itens separados em 'cotacoes[]'. Algumas colunas podem ser de produtos parciais (ex: "Proteção para Vidros" da Ituran, "Roubo/Furto" da Suhai) — extraia também, são opções válidas.

═══════════════════════════════════════
REGRA #2 — DADOS DO CLIENTE/VEÍCULO
═══════════════════════════════════════
Extraia somente o NOME DO SEGURADO e a MARCA/MODELO do veículo. Ignore CEP, vigência, condutor adicional, etc. — não precisamos.

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
REGRA #5 — MARCADORES "X" / NEGAÇÃO (IMPORTANTE)
═══════════════════════════════════════
Em tabelas comparativas é comum que uma célula tenha "X", "—", "✗", "Não" ou esteja em branco indicando que aquela cobertura NÃO está incluída naquele produto. Trate assim:
- Para campos de TEXTO ('vidros', 'carro_reserva', 'assistencia_24h'): se for "X" / "Não" / vazio / "—" / "✗", envie EXATAMENTE a string "Não incluso". Se houver descrição (ex: "Reboque 500 km"), envie a descrição.
- Para campos NUMÉRICOS: se a célula tiver "X" / "Não" / vazio, OMITA o campo (NÃO envie 0).
- NUNCA escreva "Não contemplado" — sempre "Não incluso".

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
                      formas_pagamento: { type: "string", description: "Resumo das formas de pagamento" },
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

    const data = parseToolArguments(toolCall.function.arguments);
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
