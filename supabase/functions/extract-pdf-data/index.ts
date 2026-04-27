import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_MODELS = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];

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

function normalizeExtractedData(data: any) {
  const operatorAliases: Record<string, string> = {
    amil: "Amil",
    bradesco: "Bradesco Saúde",
    "bradesco saúde": "Bradesco Saúde",
    sulamerica: "SulAmérica",
    "sulamérica": "SulAmérica",
    unimed: "Unimed",
    porto: "Porto Seguro",
    "porto seguro": "Porto Seguro",
    notre: "NotreDame Intermédica",
    notreDame: "NotreDame Intermédica",
    hapvida: "Hapvida",
  };

  const stripOperatorFromPlan = (planName = "", operatorName = "") => {
    let cleaned = String(planName).trim().replace(/\s+/g, " ");
    if (!cleaned || !operatorName) return cleaned;
    const tokens = [operatorName, ...Object.values(operatorAliases)].filter(Boolean);
    for (const token of tokens) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cleaned = cleaned.replace(new RegExp(`^${escaped}\\s*[-–—:]?\\s*`, "i"), "").trim();
    }
    return cleaned || String(planName).trim();
  };

  let operatorName = String(data?.operadora_nome || "").trim();
  const plans = Array.isArray(data?.planos) ? data.planos : [];
  const operatorCandidates = [operatorName, ...plans.map((p: any) => String(p?.operadora_nome || p?.plano_nome || ""))].join(" ").toLowerCase();
  for (const [needle, canonical] of Object.entries(operatorAliases)) {
    if (operatorCandidates.includes(needle.toLowerCase())) {
      operatorName = canonical;
      break;
    }
  }

  data.operadora_nome = operatorName;
  data.planos = plans.map((plan: any) => ({
    ...plan,
    plano_nome: stripOperatorFromPlan(plan?.plano_nome || plan?.operadora_nome || "", operatorName),
  }));
  return data;
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
            content: `Você é um especialista SÊNIOR em extrair dados de PDFs de cotações de planos de saúde e seguros no Brasil. Sua leitura precisa ser MINUCIOSA e COMPLETA — leia capa, cabeçalhos, rodapés, todas as tabelas, notas de rodapé, observações e textos em letra pequena.

═══════════════════════════════════════
REGRA #1 — UMA OPERADORA POR PDF, MÚLTIPLOS PLANOS
═══════════════════════════════════════
Um PDF é SEMPRE de UMA ÚNICA operadora (Amil, SulAmérica, Bradesco Saúde, Hapvida, NotreDame, Unimed, Porto Seguro, etc.). NUNCA divida em múltiplas operadoras.
Se o PDF apresenta vários planos da MESMA marca (ex: "Amil Black I QP R1", "Amil Black S2500 QP R2", "Amil 200 QC", "Amil 400 QP"), TODOS vão no array 'planos[]' com o mesmo 'operadora_nome'.
NUNCA repita o nome da operadora em 'plano_nome'. Se 'operadora_nome' = "Amil", use 'plano_nome' = "Black I QP R1" (não "Amil Black I QP R1").

═══════════════════════════════════════
REGRA #2 — TABELAS COMPARATIVAS LADO A LADO
═══════════════════════════════════════
Quando o PDF mostrar uma tabela com VÁRIAS COLUNAS (cada coluna = um plano), extraia CADA COLUNA como um item separado em 'planos[]'. Compare cada linha da tabela e preencha os campos correspondentes (coparticipação, acomodação, abrangência, reembolso, valor) DENTRO de cada plano. Se um campo é IGUAL para todos os planos da tabela, repita-o em cada plano OU deixe no nível superior (será usado como fallback).

═══════════════════════════════════════
REGRA #3 — VALOR MENSAL (PRIORIDADE MÁXIMA)
═══════════════════════════════════════
Para 'valor_mensal' de cada plano, PROCURE OBRIGATORIAMENTE por (em ordem de prioridade):
1. "Valor Total", "Total Mensal", "Mensalidade Total", "Total a Pagar", "Total Geral", "Total do Plano", "Valor Final", "Soma Total", "Total Consolidado"
2. "Valor da Mensalidade", "Mensalidade", "Preço Total", "Custo Total", "Investimento Mensal"
3. Valores em DESTAQUE (negrito, fonte maior, caixa colorida) no rodapé/canto da proposta ou logo após a tabela de faixas etárias.

Esses totais costumam aparecer DEPOIS da tabela de faixas etárias, em destaque visual. EXTRAIA SEMPRE esse valor consolidado quando existir. Use APENAS números (ex: 1234.56), sem R$ nem pontos de milhar.

═══════════════════════════════════════
REGRA #4 — SINÔNIMOS DOS CAMPOS
═══════════════════════════════════════
- COPARTICIPAÇÃO: "copart", "com/sem participação", "fator moderador", "participação do beneficiário", "% sobre procedimentos". Se houver QUALQUER percentual ou taxa por uso → "Sim". Se mencionar explicitamente "sem coparticipação" ou "integral" → "Não".
- ACOMODAÇÃO: "padrão de acomodação", "tipo de internação", "quarto", "leito", "apto"/"apartamento" (privativo) vs "enfermaria"/"coletivo" (compartilhado). "QP" ou "QPR" geralmente = Apartamento; "QC" geralmente = Enfermaria/Coletivo.
- ABRANGÊNCIA: "área de atuação", "área geográfica", "cobertura territorial", "região de atendimento". Valores comuns: "Nacional", "Estadual - SP", "Regional - Grande SP", "Grupo de municípios".
- REEMBOLSO: "livre escolha", "reembolso integral/parcial", "tabela de reembolso", "múltiplo do CH", "U$" ou "USS". Se mencionar valor de reembolso → "Sim" ou "Parcial". Se "sem reembolso" → "Não".
- REDE CREDENCIADA: liste APENAS 3 hospitais MAIS RELEVANTES E RECONHECIDOS (referência de alta complexidade, grande porte) na região do cliente. Um nome por linha, sem descrições.

═══════════════════════════════════════
REGRA #5 — FAIXAS ETÁRIAS
═══════════════════════════════════════
Extraia a tabela COMPLETA de faixas etárias com valores. Formato OBRIGATÓRIO (separe com " | "):
"0-18: R$921,64 | 19-23: R$1.015,44 | ... | 59-99: R$5.646,72"
Use vírgula como separador decimal (formato BRL). A última faixa SEMPRE vai até 99.

═══════════════════════════════════════
REGRA #6 — HONESTIDADE
═══════════════════════════════════════
NUNCA invente dados. Se um campo não aparece comprovadamente no PDF, deixe vazio. Mas FAÇA O MÁXIMO ESFORÇO para encontrar a informação antes de desistir — releia o documento procurando sinônimos e variações.${locationContext}`,
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
                    enum: ["Enfermaria", "Apartamento", ""],
                    description: "Tipo de acomodação. Responda APENAS 'Apartamento' (quarto privativo/individual) ou 'Enfermaria' (quarto coletivo/compartilhado). Procure por termos como 'padrão de acomodação', 'internação em apartamento', 'quarto privativo', 'quarto coletivo'. Só retorne string vazia se REALMENTE não houver menção no PDF.",
                  },
                  abrangencia: {
                    type: "string",
                    description: "Área de abrangência (ex: 'Nacional', 'Estadual - SP', 'Regional', 'Grupo de municípios'). Procure por 'área de atuação', 'área geográfica', 'cobertura territorial'. EXTRAIA sempre que houver qualquer menção. NÃO INVENTE.",
                  },
                  reembolso: {
                    type: "string",
                    enum: ["Sim", "Não", "Parcial", ""],
                    description: "Responda APENAS 'Sim' (se houver reembolso integral/livre escolha), 'Não' (se o plano não oferecer reembolso) ou 'Parcial' (se houver reembolso limitado/por tabela). Procure por 'livre escolha', 'reembolso integral', 'tabela de reembolso', 'sem reembolso'. Só retorne string vazia se realmente não houver menção.",
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
                    description: "Array com TODOS os planos encontrados no documento, TODOS da MESMA operadora informada em operadora_nome. Cada plano tem seu nome, valor mensal (se único) e suas faixas etárias com valores. Quando os planos diferem em coparticipação/acomodação/abrangência/reembolso, preencha esses campos POR plano aqui.",
                    items: {
                      type: "object",
                      properties: {
                        plano_nome: {
                          type: "string",
                          description: "Nome do plano específico SEM repetir o nome da operadora (ex: 'Black I QP R1', 'S2500 QP R2', 'Premium 200', 'Smart 400'). Se na fonte original aparece 'Amil Black I QP R1' e a operadora já é 'Amil', registre apenas 'Black I QP R1'.",
                        },
                        valor_mensal: {
                          type: "number",
                          description: "Valor mensal TOTAL do plano em R$ (apenas número, sem símbolos, ex: 1234.56). PROCURE ATIVAMENTE por termos como: 'Valor Total', 'Total Mensal', 'Mensalidade Total', 'Total a Pagar', 'Valor da Mensalidade', 'Mensalidade', 'Preço Total', 'Total do Plano', 'Valor Final', 'Total Geral', 'Soma Total'. Se houver UM valor consolidado/total destacado para o plano (geralmente no rodapé da proposta, em destaque, ou após a tabela de faixas etárias), EXTRAIA esse valor aqui. Apenas se o PDF não apresentar nenhum valor total/consolidado e tiver SOMENTE a tabela de faixas etárias, omita ou retorne 0. NUNCA invente valores.",
                        },
                        coparticipacao: {
                          type: "string",
                          enum: ["Sim", "Não", ""],
                          description: "Coparticipação ESPECÍFICA deste plano (Sim/Não). Preencha quando o PDF distinguir entre planos. Caso contrário deixe vazio para herdar do nível superior.",
                        },
                        acomodacao: {
                          type: "string",
                          enum: ["Enfermaria", "Apartamento", ""],
                          description: "Acomodação ESPECÍFICA deste plano (Enfermaria/Apartamento). Preencha quando diferir entre planos.",
                        },
                        abrangencia: {
                          type: "string",
                          description: "Abrangência ESPECÍFICA deste plano. Preencha quando diferir entre planos.",
                        },
                        reembolso: {
                          type: "string",
                          enum: ["Sim", "Não", "Parcial", ""],
                          description: "Reembolso ESPECÍFICO deste plano (Sim/Não/Parcial). Preencha quando diferir entre planos.",
                        },
                        resumo_cobertura: {
                          type: "string",
                          description: "Resumo de cobertura ESPECÍFICO deste plano. Preencha quando diferir entre planos.",
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

    const extractedData = normalizeExtractedData(parseToolArguments(toolCall.function.arguments));

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
