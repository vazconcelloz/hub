import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro"];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGemini(apiKey: string, body: Record<string, unknown>) {
  let lastErr = "Erro desconhecido";
  let lastStatus = 500;
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const resp = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...body, model }),
        },
      );
      if (resp.ok) return await resp.json();
      lastStatus = resp.status;
      lastErr = await resp.text();
      console.error(`Gemini ${model} attempt ${attempt + 1}:`, resp.status, lastErr.slice(0, 300));
      if (![429, 500, 502, 503, 504].includes(resp.status)) break;
      await wait(800 * (attempt + 1));
    }
  }
  throw new Error(`AI error ${lastStatus}: ${lastErr.slice(0, 200)}`);
}

function parseJsonLoose(raw: string) {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(binary);
}

async function pdfToText(pdfBytes: Uint8Array, apiKey: string): Promise<string> {
  const base64 = bytesToBase64(pdfBytes);
  const result = await callGemini(apiKey, {
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extraia TODO o conteúdo textual desse PDF preservando a estrutura de tabelas (use TAB ou | como separadores). Não resuma, não interprete — apenas devolva o texto bruto completo, página por página.",
          },
          { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
        ],
      },
    ],
  });
  return result.choices?.[0]?.message?.content ?? "";
}

function excelToText(bytes: Uint8Array): string {
  const wb = XLSX.read(bytes, { type: "array" });
  const parts: string[] = [];
  for (const name of wb.SheetNames) {
    parts.push(`=== Sheet: ${name} ===`);
    parts.push(XLSX.utils.sheet_to_csv(wb.Sheets[name], { FS: "\t" }));
  }
  return parts.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { operadora_id, file_url, file_name } = await req.json();
    if (!operadora_id || !file_url) {
      return new Response(JSON.stringify({ error: "operadora_id e file_url são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const fileResp = await fetch(file_url);
    if (!fileResp.ok) throw new Error(`Falha ao baixar arquivo: ${fileResp.status}`);
    const fileBytes = new Uint8Array(await fileResp.arrayBuffer());

    const isExcel = /\.(xlsx|xls)$/i.test(file_name ?? file_url);
    const rawText = isExcel ? excelToText(fileBytes) : await pdfToText(fileBytes, GEMINI_API_KEY);

    if (!rawText || rawText.length < 50) {
      throw new Error("Não foi possível extrair texto do arquivo");
    }

    const TEXT_CAP = 180_000;
    const textToAnalyze = rawText.length > TEXT_CAP ? rawText.slice(0, TEXT_CAP) : rawText;

    const structured = await callGemini(GEMINI_API_KEY, {
      messages: [
        {
          role: "system",
          content:
            "Você é especialista em planos de saúde brasileiros. Recebe o texto de uma tabela de rede credenciada (hospitais por cidade, com colunas representando planos da operadora) e devolve JSON estruturado.",
        },
        {
          role: "user",
          content: `Analise o texto abaixo da rede credenciada e devolva JSON com:
- planos: array com os nomes dos planos detectados nas colunas (ex: ["Efetivo", "Efetivo Plus", "Flex", "Premium"]).
- itens: array de objetos { cidade, nome, tipo, coberturas_por_plano }.
  - tipo deve ser um destes: "hospital", "clinica", "laboratorio", "pronto_socorro", "outros".
  - coberturas_por_plano é um objeto onde as chaves são EXATAMENTE os nomes dos planos detectados e os valores são strings com as siglas/coberturas como aparecem (ex: "H/P.S/M/A", "HDIA"). Omita planos vazios para o item.
  - Se a tabela diferenciar quarto/enfermaria, junte ambos no mesmo plano com " | " (ex: Plano: "ENF: H/P.S | QTO: H/P.S/M").
- IMPORTANTE: extraia TODOS os hospitais que aparecerem no texto, sem limite.
- Devolva APENAS JSON, sem markdown.

TEXTO:
${textToAnalyze}`,
        },
      ],
    });

    const content = structured.choices?.[0]?.message?.content ?? "{}";
    const parsed = parseJsonLoose(content);
    const planos: string[] = Array.isArray(parsed.planos) ? parsed.planos : [];
    const itens: any[] = Array.isArray(parsed.itens) ? parsed.itens : [];

    if (itens.length === 0) {
      throw new Error("Nenhum item identificado no arquivo");
    }

    await supabase.from("rede_credenciada_catalogo").delete().eq("operadora_id", operadora_id);

    const rows = itens.map((it) => ({
      operadora_id,
      nome: String(it.nome ?? "").trim().slice(0, 200),
      tipo: ["hospital", "clinica", "laboratorio", "pronto_socorro", "outros"].includes(it.tipo)
        ? it.tipo
        : "hospital",
      cidade: String(it.cidade ?? "").trim().slice(0, 120),
      estado: String(it.estado ?? "").trim().slice(0, 2).toUpperCase() || "XX",
      bairro: it.bairro ?? null,
      endereco: it.endereco ?? null,
      cep: it.cep ?? null,
      telefone: it.telefone ?? null,
      especialidades: Array.isArray(it.especialidades) ? it.especialidades : [],
      planos_aplicaveis: it.coberturas_por_plano ? Object.keys(it.coberturas_por_plano) : [],
      coberturas_por_plano: it.coberturas_por_plano ?? {},
      ativo: true,
      destaque: false,
    })).filter((r) => r.nome && r.cidade);

    const BATCH = 200;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const { error } = await supabase.from("rede_credenciada_catalogo").insert(slice);
      if (error) throw new Error(`Erro ao inserir lote: ${error.message}`);
      inserted += slice.length;
    }

    await supabase.from("rede_credenciada_uploads").insert({
      operadora_id,
      arquivo_nome: file_name ?? "arquivo",
      arquivo_url: file_url,
      total_importado: inserted,
      planos_detectados: planos,
      status: "concluido",
    });

    return new Response(
      JSON.stringify({
        success: true,
        total: inserted,
        planos,
        sample: rows.slice(0, 5),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("import-rede-credenciada error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
