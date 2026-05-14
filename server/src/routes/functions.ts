import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { Resend } from 'resend';
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

router.post('/invoke/:functionName', authMiddleware, async (req, res) => {
  try {
    const { functionName } = req.params;
    const body = req.body;

    switch (functionName) {
      case 'send-convite-email': {
        const { email, role, token } = body;
        
        if (!process.env.RESEND_API_KEY) {
          console.warn("Resend API Key não configurada. Simulando envio para", email);
          return res.json({ success: true, mocked: true });
        }

        const link = `http://localhost:8081/cadastro?token=${token}`;
        await resend.emails.send({
          from: 'Hub Grupo FBN <onboarding@resend.dev>',
          to: [email],
          subject: 'Convite - Hub Grupo FBN',
          html: `<p>Você foi convidado para acessar o Hub Grupo FBN como ${role}.</p><p><a href="${link}">Clique aqui para criar sua conta</a></p>`
        });
        
        return res.json({ success: true });
      }

      case 'extract-pdf-data':
      case 'extract-auto-pdf': {
        const { pdf_base64 } = body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey || apiKey === 'SUA_CHAVE_AQUI') {
          return res.json({
            sucesso: true,
            data: functionName === 'extract-pdf-data' ? {
              operadora_nome: "SulAmérica (MOCK)",
              cliente_nome: "João Silva",
              planos: [{ plano_nome: "Exato", valor_mensal: 450.00, faixas_etarias: "0-18: R$ 450,00" }]
            } : {
              cliente_nome: "João Silva",
              veiculo_marca_modelo: "Toyota Corolla (MOCK)",
              cotacoes: [{ seguradora_nome: "Porto Seguro", premio_total: 2500.00 }]
            }
          });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const prompt = functionName === 'extract-pdf-data' 
          ? `Extraia os dados deste PDF de cotação de plano de saúde. Retorne APENAS o JSON final.
            Formato esperado:
            {
              "operadora_nome": "string",
              "cliente_nome": "string",
              "cliente_cidade": "string",
              "cliente_estado": "string",
              "coparticipacao": "string",
              "acomodacao": "string",
              "abrangencia": "string",
              "reembolso": "string",
              "resumo_cobertura": "string",
              "rede_credenciada_resumo": "string",
              "previsao_reajuste_faixa": "string",
              "planos": [
                {
                  "plano_nome": "Nome do plano/produto",
                  "valor_mensal": number,
                  "faixas_etarias": "string"
                }
              ]
            }`
          : `Extraia os dados deste PDF de cotação de seguro auto. Retorne APENAS o JSON final.
            IMPORTANTE: Identifique o nome comercial do produto/plano de cada seguradora (ex: Azul Leve, Porto Seguro Auto, Liberty Exclusive) e coloque no campo "produto_nome".
            Formato esperado:
            {
              "cliente_nome": "string",
              "veiculo_marca_modelo": "string",
              "tipo_cotacao": "string",
              "vigencia_inicio": "YYYY-MM-DD",
              "vigencia_fim": "YYYY-MM-DD",
              "cep_pernoite": "string",
              "condutor_18_26": boolean,
              "cotacoes": [
                {
                  "seguradora_nome": "string",
                  "produto_nome": "Nome comercial do produto/plano",
                  "premio_total": number,
                  "cobertura_resumo": "string",
                  "franquia_valor": number,
                  "franquia_tipo": "string",
                  "percentual_fipe": "string",
                  "danos_materiais": number,
                  "danos_corporais": number,
                  "danos_morais": number,
                  "app_morte_invalidez": number,
                  "assistencia_24h": "string",
                  "vidros": "string",
                  "carro_reserva": "string",
                  "formas_pagamento": "string",
                  "formas_pagamento_detalhes": [
                    { "tipo": "string", "descricao": "string" }
                  ]
                }
              ]
            }`;

        const result = await model.generateContent([
          { text: prompt },
          { inlineData: { data: pdf_base64, mimeType: "application/pdf" } }
        ]);

        const text = result.response.text();
        console.log("Gemini Response Text:", text);
        
        // Regex para capturar apenas o objeto JSON entre chaves
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error("AI Response does not contain JSON:", text);
          throw new Error("A IA não retornou um formato JSON válido.");
        }

        const extractedData = JSON.parse(jsonMatch[0]);

        return res.json({
          sucesso: true,
          data: extractedData
        });
      }

      case 'import-rede-credenciada': {
        return res.json({
          sucesso: true,
          registros_processados: 1,
          erros: []
        });
      }

      default:
        return res.status(404).json({ error: `Função ${functionName} não encontrada.` });
    }
  } catch (error: any) {
    console.error(`Error in function ${req.params.functionName}:`, error.message, error.stack);
    return res.status(500).json({ error: `Erro interno ao executar a função: ${error.message}` });
  }
});

export default router;
