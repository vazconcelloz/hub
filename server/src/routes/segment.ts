import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import fs from 'fs';
import path from 'path';

const router = Router();

router.post('/export', authMiddleware, async (req, res) => {
  try {
    const { question, database = 'FBN', limit = 50, file_format = 'xlsx' } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'A pergunta (question) é obrigatória.' });
    }

    const token = process.env.FBN_WEBHOOK_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'Token do webhook não configurado no servidor.' });
    }

    // Faz a chamada para a API externa
    const response = await fetch('http://webhook.grupofbn.com.br/agents/segment/export', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question,
        database,
        limit,
        file_format
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Webhook error:', text);
      let errorMessage = 'Erro ao gerar segmentação na API externa.';
      try {
        const json = JSON.parse(text);
        if (json.detail) errorMessage = json.detail;
      } catch (e) {}
      
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

// Rota dedicada para forçar o download seguro pelo navegador
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
