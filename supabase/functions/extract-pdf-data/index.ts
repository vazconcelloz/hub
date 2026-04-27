import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGeminiWithFallback(apiKey: string, body: Record<string, unknown>) {
  let lastStatus = 500;
  let lastError = "Erro desconhecido na IA";

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...body, model }),
      });

      if (response.ok) return await response.json();

      lastStatus = response.status;
      lastError = await response.text();
      console.error(`Gemini error (${model}, attempt ${attempt + 1}):`, response.status, lastError);

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
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdf_base64, cidade, estado } = await req.json();
    if (!pdf_base64) {
      return new Response(JSON.stringify({ error: "pdf_base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const locationContext = cidade || estado
      ? `\nO cliente está localizado em ${cidade || ""}${cidade && estado ? "/" : ""}${estado || ""}. Ao descrever a rede credenciada (campo rede_credenciada_resumo), liste APENAS os 3 hospitais MAIS RELEVANTES e reconhecidos da rede da operadora nessa região (priorize hospitais de grande porte, referência ou alta complexidade). Apenas nomes reais que constem no PDF ou que sejam comprovadamente da rede da operadora.`
      : "";

    const result = await callGeminiWithFallback(GEMINI_API_KEY, {
        messages: [
          {
            role: "system",
            content: `Você é um especialista em extrair dados de documentos PDF de operadoras de planos de saúde e seguros no Brasil.
Analise o conteúdo do PDF e extraia as informações solicitadas. Se não conseguir identificar algum campo, retorne string vazia para texto ou null para valor numérico.
REGRA CRÍTICA: Extraia APENAS dados que estejam EXPLICITAMENTE presentes no documento. NUNCA invente, deduza ou complete informações que não estejam claramente escritas no PDF. Se um campo não estiver no documento, retorne string vazia.
IMPORTANTE: Um PDF pode conter MÚLTIPLOS planos (ex: Amil Black I QP R1, R2, R3 e Amil Black S2500 QP R1, R2). Extraia TODOS os planos encontrados no documento, cada um com suas próprias faixas etárias e valores.${locationContext}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extraia os dados deste PDF de operadora de plano de saúde/seguro usando a função extract_multiple_plans. Se houver múltiplos planos na tabela (ex: colunas diferentes para planos diferentes), extraia TODOS separadamente.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdf_base64}`,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_multiple_plans",
              description:
                "Extrai dados estruturados de um PDF de operadora de plano de saúde ou seguro, suportando múltiplos planos em um único documento",
              parameters: {
                type: "object",
                properties: {
                  operadora_nome: {
                    type: "string",
                    description: "Nome da operadora (ex: Amil, SulAmérica, Bradesco Saúde)",
                  },
                  coparticipacao: {
                    type: "string",
                    enum: ["Sim", "Não", ""],
                    description: "Responda APENAS 'Sim' se o plano tiver coparticipação, ou 'Não' se não tiver. Se não conseguir identificar com clareza no documento, retorne string vazia.",
                  },
                  acomodacao: {
                    type: "string",
                    description: "Tipo de acomodação (ex: 'Apartamento', 'Enfermaria'). Apenas se explícito no PDF.",
                  },
                  abrangencia: {
                    type: "string",
                    description: "Área de abrangência (ex: 'Nacional', 'Estadual - SP', 'Regional'). EXTRAIA APENAS se estiver EXPLICITAMENTE escrito no PDF. Se não houver menção clara à abrangência, retorne string vazia. NÃO INVENTE.",
                  },
                  reembolso: {
                    type: "string",
                    description: "Informações sobre reembolso, apenas se explícito no PDF. Caso contrário, string vazia.",
                  },
                  resumo_cobertura: {
                    type: "string",
                    description: "Resumo das coberturas principais (consultas, exames, internação, etc.), apenas se constar no PDF.",
                  },
                  rede_credenciada_resumo: {
                    type: "string",
                    description: "Liste EXATAMENTE 3 hospitais (no máximo) da rede credenciada — os MAIS RELEVANTES e reconhecidos da região do cliente (priorize hospitais de grande porte, referência em alta complexidade, mais conhecidos publicamente). Um nome por linha, apenas o nome do hospital, sem descrições.",
                  },
                  previsao_reajuste_faixa: {
                    type: "string",
                    description: "Previsão de reajuste por mudança de faixa etária.",
                  },
                  cliente_nome: {
                    type: "string",
                    description: "Nome do cliente/beneficiário que aparece no documento de cotação",
                  },
                  cliente_cidade: {
                    type: "string",
                    description: "Cidade do cliente mencionada no documento",
                  },
                  cliente_estado: {
                    type: "string",
                    description: "Estado (UF) do cliente mencionado no documento (ex: SP, RJ, MG)",
                  },
                  planos: {
                    type: "array",
                    description: "Array com TODOS os planos encontrados no documento. Cada plano tem seu nome e suas faixas etárias com valores.",
                    items: {
                      type: "object",
                      properties: {
                        plano_nome: {
                          type: "string",
                          description: "Nome do plano específico (ex: Amil Black I QP R1, Amil Black S2500 QP R2)",
                        },
                        faixas_etarias: {
                          type: "string",
                          description: "Tabela de faixas etárias e valores mensais para ESTE plano. Formato OBRIGATÓRIO: '0-18: R$921,64 | 19-23: R$1.015,44 | 24-28: R$1.218,53 | 29-33: R$1.340,39 | 34-38: R$1.657,59 | 39-43: R$1.989,11 | 44-48: R$2.585,84 | 49-53: R$3.361,59 | 54-58: R$4.034,44 | 59-99: R$5.646,72'. Use SEMPRE vírgula como separador decimal (formato brasileiro). Para a última faixa, use 99 como idade máxima.",
                        },
                      },
                      required: ["plano_nome", "faixas_etarias"],
                    },
                  },
                },
                required: ["operadora_nome", "planos"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "extract_multiple_plans" },
        },
    });
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured data");
    }

    const extractedData = parseToolArguments(toolCall.function.arguments);

    // Enrich rede_credenciada_resumo if empty/short
    const redeResumo = extractedData.rede_credenciada_resumo || "";
    const operadoraNome = extractedData.operadora_nome || "";
    const clienteCidade = cidade || extractedData.cliente_cidade || "";
    const clienteEstado = estado || extractedData.cliente_estado || "";

    if (redeResumo.length < 50 && operadoraNome && (clienteCidade || clienteEstado)) {
      try {
        const enrichResult = await callGeminiWithFallback(GEMINI_API_KEY, {
            messages: [
              {
                role: "system",
                content: "Você é um especialista em planos de saúde no Brasil. Responda de forma direta e concisa.",
              },
              {
                role: "user",
                content: `Liste os 3 hospitais MAIS RELEVANTES e reconhecidos da rede credenciada da operadora ${operadoraNome} na região de ${clienteCidade}${clienteEstado ? "/" + clienteEstado : ""}. Priorize hospitais de grande porte, referência em alta complexidade e mais conhecidos publicamente. Um por linha, apenas o nome do hospital, sem descrições. Máximo 3.`,
              },
            ],
        });

        const enrichedText = enrichResult.choices?.[0]?.message?.content;
        if (enrichedText) {
          extractedData.rede_credenciada_resumo = enrichedText.trim();
        }
      } catch (enrichError) {
        console.error("Enrich error (non-fatal):", enrichError);
      }
    }

    return new Response(JSON.stringify({ data: extractedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("extract-pdf-data error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
