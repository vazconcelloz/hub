import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const locationContext = cidade || estado
      ? `\nO cliente está localizado em ${cidade || ""}${cidade && estado ? "/" : ""}${estado || ""}. Ao descrever a rede credenciada (campo rede_credenciada_resumo), PRIORIZE os melhores hospitais, laboratórios e clínicas mais próximos dessa região. Liste os nomes dos principais hospitais e laboratórios da rede nessa localidade.`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em extrair dados de documentos PDF de operadoras de planos de saúde e seguros no Brasil.
Analise o conteúdo do PDF e extraia as informações solicitadas. Se não conseguir identificar algum campo, retorne string vazia para texto ou null para valor numérico.
Extraia APENAS dados que estejam claramente presentes no documento. Não invente dados.${locationContext}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extraia os dados deste PDF de operadora de plano de saúde/seguro usando a função extract_operator_data.",
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
              name: "extract_operator_data",
              description:
                "Extrai dados estruturados de um PDF de operadora de plano de saúde ou seguro",
              parameters: {
                type: "object",
                properties: {
                  operadora_nome: {
                    type: "string",
                    description: "Nome da operadora (ex: Amil, SulAmérica, Bradesco Saúde)",
                  },
                  plano_nome: {
                    type: "string",
                    description: "Nome do plano específico (ex: Amil 400 QC Nacional)",
                  },
                  valor_mensal: {
                    type: "number",
                    description:
                      "Valor mensal do plano em reais. Se houver múltiplas faixas, use o valor mais relevante ou a média.",
                  },
                  coparticipacao: {
                    type: "string",
                    description:
                      "Informações sobre coparticipação (ex: 'Sim, 30% em consultas e exames' ou 'Sem coparticipação')",
                  },
                  acomodacao: {
                    type: "string",
                    description: "Tipo de acomodação (ex: 'Apartamento', 'Enfermaria')",
                  },
                  abrangencia: {
                    type: "string",
                    description: "Área de abrangência (ex: 'Nacional', 'Estadual - SP', 'Regional')",
                  },
                  reembolso: {
                    type: "string",
                    description: "Informações sobre reembolso, se disponível",
                  },
                  resumo_cobertura: {
                    type: "string",
                    description:
                      "Resumo das coberturas principais (consultas, exames, internação, etc.)",
                  },
                  rede_credenciada_resumo: {
                    type: "string",
                    description:
                      "Liste no máximo 5 hospitais e laboratórios da rede credenciada mais próximos da região do cliente, um por linha. Apenas nomes, sem descrições adicionais.",
                  },
                  faixas_etarias: {
                    type: "string",
                    description:
                      "Tabela de faixas etárias e valores mensais encontrada no PDF. Formato OBRIGATÓRIO: '0-18: R$250,00 | 19-23: R$310,50 | 24-28: R$380,00 | 29-33: R$420,00 | 34-38: R$480,00 | 39-43: R$560,00 | 44-48: R$680,00 | 49-53: R$850,00 | 54-58: R$1.100,00 | 59-99: R$1.500,00'. Use SEMPRE vírgula como separador decimal (formato brasileiro). Para a última faixa, use 99 como idade máxima (ex: 59-99 em vez de 59+). Extraia TODAS as faixas e valores que aparecerem no documento.",
                  },
                  previsao_reajuste_faixa: {
                    type: "string",
                    description:
                      "Previsão de reajuste por mudança de faixa etária. Explique brevemente como o valor muda ao trocar de faixa, incluindo percentuais de aumento entre faixas quando disponível. Ex: 'Reajuste médio de 15-20% entre faixas até 48 anos. A partir dos 49 anos, o reajuste pode chegar a 30-40% por faixa.'",
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
                },
                required: ["operadora_nome"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "extract_operator_data" },
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos nas configurações." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured data");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);

    // Enrich rede_credenciada_resumo if empty/short and we have location + operator info
    const redeResumo = extractedData.rede_credenciada_resumo || "";
    const operadoraNome = extractedData.operadora_nome || "";
    const clienteCidade = cidade || extractedData.cliente_cidade || "";
    const clienteEstado = estado || extractedData.cliente_estado || "";

    if (redeResumo.length < 50 && operadoraNome && (clienteCidade || clienteEstado)) {
      try {
        const enrichResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "Você é um especialista em planos de saúde no Brasil. Responda de forma direta e concisa.",
              },
              {
                role: "user",
                content: `Liste os 5 principais hospitais da rede credenciada da operadora ${operadoraNome} na região de ${clienteCidade}${clienteEstado ? "/" + clienteEstado : ""}. Um por linha, apenas nomes reais e conhecidos. Máximo 5.`,
              },
            ],
          }),
        });

        if (enrichResponse.ok) {
          const enrichResult = await enrichResponse.json();
          const enrichedText = enrichResult.choices?.[0]?.message?.content;
          if (enrichedText) {
            extractedData.rede_credenciada_resumo = enrichedText.trim();
          }
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
