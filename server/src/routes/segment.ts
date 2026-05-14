import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const router = Router();

// URL configurável — no Docker usa api-python:8000, localmente pode apontar para outro endereço
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'https://webhook.grupofbn.com.br';

// Dados mock para desenvolvimento local quando a API Python não está disponível
function generateMockData(question: string): any[] {
  const nomes = [
    'Maria Silva', 'João Santos', 'Ana Oliveira', 'Carlos Souza',
    'Fernanda Lima', 'Roberto Costa', 'Juliana Pereira', 'Marcos Almeida',
    'Patricia Rodrigues', 'Lucas Ferreira', 'Camila Barbosa', 'Rafael Mendes'
  ];
  const cidades = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Brasília'];
  const produtos = ['Saúde PME', 'Saúde Adesão', 'Consórcio', 'Vida Individual', 'Auto', 'Dental'];
  const status = ['Ativo', 'Inativo', 'Pendente'];

  return Array.from({ length: 15 }, (_, i) => ({
    nome: nomes[i % nomes.length],
    email: `${nomes[i % nomes.length].toLowerCase().replace(' ', '.')}@email.com`,
    telefone: `(11) 9${String(Math.floor(Math.random() * 90000000 + 10000000))}`,
    cidade: cidades[i % cidades.length],
    produto: produtos[i % produtos.length],
    status: status[i % status.length],
    valor_mensal: `R$ ${(Math.random() * 2000 + 200).toFixed(2)}`,
  }));
}

/** Tenta chamar a API Python. Se falhar (ex: dev local), retorna null. */
async function callPythonApi(endpoint: string, body: object): Promise<Response | null> {
  try {
    const token = process.env.FBN_WEBHOOK_TOKEN;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000); // 120s timeout

    const response = await fetch(`${PYTHON_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (err: any) {
    // ENOTFOUND / ECONNREFUSED / TIMEOUT = API Python indisponível
    console.warn(`⚠️  API Python indisponível (${err.cause?.code || err.code || err.name || 'UNKNOWN'}). Usando fallback local.`);
    return null;
  }
}

// -------------------------------------------------------
// POST /export — Gera e baixa a planilha Excel
// -------------------------------------------------------
router.post('/export', authMiddleware, async (req, res) => {
  try {
    const { question, database = 'FBN', limit = 10000, file_format = 'xlsx' } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'A pergunta (question) é obrigatória.' });
    }

    const response = await callPythonApi('/agents/segment/export', {
      question, database, limit, file_format
    });

    if (!response) {
      return res.status(503).json({ error: 'API de segmentação indisponível. Execute via Docker para exportar Excel.' });
    }

    if (!response.ok) {
      const text = await response.text();
      console.error('Webhook error:', text);
      let errorMessage = 'Erro ao gerar segmentação na API externa.';
      try {
        const json = JSON.parse(text);
        if (json.detail) errorMessage = json.detail;
      } catch (e) { }
      return res.status(response.status).json({ error: errorMessage });
    }

    // Pega o buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Salva no disco temporariamente
    const tempDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileName = `segmentacao_${Date.now()}.xlsx`;
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, buffer);

    // Retorna a URL pública usando a rota segura de download
    return res.json({ downloadUrl: `/api/segment/download/${fileName}`, fileName });

  } catch (error: any) {
    console.error('Segment export error:', error);
    return res.status(500).json({ error: 'Erro interno ao processar a exportação.' });
  }
});

// -------------------------------------------------------
// POST /preview — Visualização prévia dos dados (JSON)
// -------------------------------------------------------
router.post('/preview', authMiddleware, async (req, res) => {
  try {
    const { question, database = 'FBN', limit = 50 } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'A pergunta (question) é obrigatória.' });
    }

    // A API Python só aceita 'csv' ou 'xlsx'. Pedimos XLSX e parseamos com SheetJS.
    const response = await callPythonApi('/agents/segment/export', {
      question, database, limit, file_format: 'xlsx'
    });

    // Fallback: API indisponível → dados mock para dev local
    if (!response) {
      console.log('📋 Retornando dados mock de preview para:', question);
      return res.json({ data: generateMockData(question), mock: true });
    }

    if (!response.ok) {
      const text = await response.text();
      console.error('Webhook preview error:', text);
      return res.status(response.status).json({ error: 'Erro ao buscar prévia dos dados.' });
    }

    // Converte XLSX → Array de objetos JSON usando SheetJS
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return res.json({ data: [], message: 'Nenhum resultado encontrado.' });
    }

    console.log(`✅ Preview retornou ${rows.length} linhas para: "${question}"`);
    return res.json({ data: rows });

  } catch (error: any) {
    console.error('Segment preview error:', error);
    return res.status(500).json({ error: 'Erro interno ao processar a prévia.' });
  }
});


// -------------------------------------------------------
// GET /rd-funnels — Buscar funis do RD Station CRM
// -------------------------------------------------------
router.get('/rd-funnels', authMiddleware, async (req, res) => {
  try {
    const rdToken = process.env.RD_STATION_CRM_TOKEN;
    if (!rdToken) {
      return res.json({
        funnels: [
          { id: 'f1', name: 'Vendas' },
          { id: 'f2', name: 'Fidelização' }
        ]
      });
    }

    // No RD Station CRM (Plug CRM), os funis são chamados de deal_pipelines
    const response = await fetch(`https://crm.rdstation.com/api/v1/deal_pipelines?token=${rdToken}`);
    if (!response.ok) {
      const text = await response.text();
      console.error('RD funnels error body:', text);
      throw new Error('Falha ao buscar funis');
    }
    const data = await response.json();
    
    // O retorno é um array direto de pipelines
    const funnels = (Array.isArray(data) ? data : (data.deal_pipelines || [])).map((f: any) => ({
      id: f.id || f._id,
      name: f.name,
      stages: (f.deal_stages || []).map((s: any) => ({
        id: s.id || s._id,
        name: s.name
      }))
    }));

    return res.json({ funnels });
  } catch (error: any) {
    console.error('RD funnels error:', error);
    return res.status(500).json({ error: 'Erro ao buscar funis.' });
  }
});

// -------------------------------------------------------
// GET /rd-fields — Buscar campos customizados do RD Station CRM
// -------------------------------------------------------
router.get('/rd-fields', authMiddleware, async (req, res) => {
  try {
    const rdToken = process.env.RD_STATION_CRM_TOKEN;
    if (!rdToken) {
      console.warn('RD_STATION_CRM_TOKEN não configurado. Retornando campos simulados...');
      return res.json({
        fields: [
          { custom_field: { id: 'cf_produto', name: 'Produto', type: 'dropdown', options: ['SEGURO RESIDENCIAL', 'SEGURO AUTO', 'PLANO DE SAÚDE', 'CONSÓRCIO', 'VIDA'] } },
          { custom_field: { id: 'cf_origem', name: 'Origem', type: 'string' } }
        ]
      });
    }

    const response = await fetch(`https://crm.rdstation.com/api/v1/custom_fields?token=${rdToken}`);
    if (!response.ok) {
      throw new Error('Falha ao buscar campos do RD Station CRM');
    }
    const data = await response.json();
    
    // O RD Station CRM retorna um array direto se não usar envelopamento. Vamos formatar para o frontend:
    const fieldsArray = Array.isArray(data) ? data : (data.custom_fields || []);
    
    // Queremos todos os campos (Empresa, Contato, Negociação) para o usuário escolher.
    const formattedFields = fieldsArray
      .map((f: any) => ({
        custom_field: {
          id: f.id || f._id,
          name: f.label,
          type: f.type,
          options: f.opts || [],
          for: f.for // 'organization', 'contact' ou 'deal'
        }
      }));

    return res.json({ fields: formattedFields });
  } catch (error: any) {
    console.error('RD Station fetch fields error:', error);
    return res.status(500).json({ error: 'Erro ao buscar campos customizados.' });
  }
});

// -------------------------------------------------------
// GET /rd-users — Buscar usuários do RD Station CRM
// -------------------------------------------------------
router.get('/rd-users', authMiddleware, async (req, res) => {
  try {
    const rdToken = process.env.RD_STATION_CRM_TOKEN;
    if (!rdToken) {
      return res.json({ users: [{ id: 'u1', name: 'Usuário Simulado' }] });
    }

    const response = await fetch(`https://crm.rdstation.com/api/v1/users?token=${rdToken}`);
    if (!response.ok) throw new Error('Falha ao buscar usuários');
    const data = await response.json();
    
    const users = (data.users || data)
      .filter((u: any) => u.active === true) // Apenas usuários ativos
      .map((u: any) => ({
        id: u.id || u._id,
        name: u.name || u.email
      }));

    return res.json({ users });
  } catch (error: any) {
    console.error('RD users error:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
});

// -------------------------------------------------------
// POST /send-to-rd — Enviar dados mapeados para o RD
// -------------------------------------------------------
router.post('/send-to-rd', authMiddleware, async (req, res) => {
  try {
    const { items, mapping, customFieldsMapping, conditionalMappings, funnelId, userIds } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Nenhum item selecionado.' });
    }

    const rdToken = process.env.RD_STATION_CRM_TOKEN;
    if (!rdToken) {
      console.warn('RD_STATION_CRM_TOKEN não configurado. Simulando envio...');
      return res.json({ success: true, message: `${items.length} negociações enviadas com sucesso para o RD Station (SIMULAÇÃO).` });
    }

    // Integração com RD Station CRM
    const results = await Promise.all(items.map(async (item, index) => {
      try {
        // Distribuição Round Robin se houver múltiplos usuários
        let assignedUserId = null;
        if (userIds && Array.isArray(userIds) && userIds.length > 0) {
          assignedUserId = userIds[index % userIds.length];
        }

        const contactName = mapping?.name ? item[mapping.name] : (item.nome || item.contato || 'Sem Nome');
        const contactEmail = mapping?.email ? item[mapping.email] : item.email;
        const contactPhone = mapping?.phone ? item[mapping.phone] : (item.telefone || item.celular);
        
        const opportunityName = mapping?.name 
          ? item[mapping.name] 
          : (item.razao_social || item.nome || `Segmentação: ${contactEmail || 'Sem Nome'}`);

        const deal_custom_fields: any[] = [];
        const contact_custom_fields: any[] = [];
        const organization_custom_fields: any[] = [];
        
        const addCustomField = (id: string, value: any, entity: string) => {
          const fieldObj = { custom_field_id: id, value };
          if (entity === 'organization') organization_custom_fields.push(fieldObj);
          else if (entity === 'contact') contact_custom_fields.push(fieldObj);
          else deal_custom_fields.push(fieldObj);
        };

        if (customFieldsMapping && Array.isArray(customFieldsMapping)) {
          customFieldsMapping.forEach((cf: any) => {
            const rawValue = item[cf.excelColumn];
            if (rawValue !== undefined && rawValue !== null) {
              const mappedValue = cf.valueMapping && cf.valueMapping[rawValue] ? cf.valueMapping[rawValue] : rawValue;
              addCustomField(cf.customFieldId, mappedValue, cf.entityType || 'deal');
            }
          });
        }

        if (conditionalMappings && Array.isArray(conditionalMappings)) {
          conditionalMappings.forEach((cm: any) => {
            const conditionValue = String(item[cm.conditionColumn] || '');
            const matchingRule = cm.rules.find((r: any) => String(r.value) === conditionValue);
            if (matchingRule && matchingRule.rdFieldId !== 'ignore') {
              const sourceValue = item[cm.sourceColumn];
              if (matchingRule.rdFieldId === 'name') {} 
              else if (matchingRule.rdFieldId === 'email') {}
              else if (matchingRule.rdFieldId === 'phone') {}
              else addCustomField(matchingRule.rdFieldId, sourceValue, matchingRule.entityType || 'deal');
            }
          });
        }

        const rdResponse = await fetch(`https://crm.rdstation.com/api/v1/opportunities?token=${rdToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            opportunity: {
              name: opportunityName,
              user_id: assignedUserId, // Atribuição do usuário
              deal_custom_fields,
              deal_stage_id: funnelId,
              contact: {
                name: contactName,
                email: contactEmail,
                phones: contactPhone ? [{ phone: contactPhone }] : [],
                contact_custom_fields
              },
              organization: {
                name: item.razao_social || item.empresa || contactName,
                organization_custom_fields
              }
            }
          })
        });
        return rdResponse.ok;
      } catch (e) {
        return false;
      }
    }));

    const successCount = results.filter(Boolean).length;
    return res.json({ 
      success: true, 
      message: `${successCount} de ${items.length} negociações enviadas para o RD Station.` 
    });

  } catch (error: any) {
    console.error('RD Station send error:', error);
    return res.status(500).json({ error: 'Erro ao enviar dados para o RD Station.' });
  }
});

// -------------------------------------------------------
// GET /download/:fileName — Download seguro pelo navegador
// -------------------------------------------------------
router.get('/download/:fileName', (req, res) => {
  const { fileName } = req.params;
  const filePath = path.join(__dirname, '../../uploads/temp', fileName);

  if (fs.existsSync(filePath)) {
    return res.download(filePath, fileName);
  } else {
    return res.status(404).send('Arquivo não encontrado');
  }
});

export default router;
