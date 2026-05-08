import { Router } from 'express';
import { prisma } from '../db';
import { authMiddleware, AuthRequest } from '../middlewares/authMiddleware';

const router = Router();

// Generic Prisma endpoint to act as a Supabase PostgREST replacement
router.post('/query', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { table, action, args } = req.body;
    
    const tableMap: Record<string, string> = {
      'user_roles': 'userRole',
      'user_setores': 'userSetor',
      'user_permissoes': 'userPermissao',
      'setores': 'setor',
      'permissoes': 'permissao',
      'setor_permissoes': 'setorPermissao',
      'convites': 'convite',
      'operadoras_catalogo': 'operadoraCatalogo',
      'rede_credenciada_catalogo': 'redeCredenciadaCatalogo',
      'coparticipacao_catalogo': 'coparticipacaoCatalogo',
      'propostas': 'proposta',
      'proposta_operadoras': 'propostaOperadora',
      'propostas_auto': 'propostaAuto',
      'proposta_auto_seguradoras': 'propostaAutoSeguradora',
      'treinamentos': 'treinamento',
      'manuais': 'manual',
      'segmentacoes': 'segmentacao',
      'profiles': 'profile',
      'users': 'user'
    };

    const prismaModel = tableMap[table];

    if (!prismaModel || !(prisma as any)[prismaModel]) {
      return res.status(400).json({ error: `Table ${table} not found or not mapped` });
    }

    // Lista de ações de leitura permitidas
    const allowedReadActions = ['findMany', 'findFirst', 'findUnique', 'count', 'aggregate', 'groupBy'];

    if (!allowedReadActions.includes(action)) {
      return res.status(403).json({ 
        error: `Ação '${action}' não permitida via proxy genérico. Use rotas específicas para modificações (segurança).` 
      });
    }

    // Execute query
    const result = await (prisma as any)[prismaModel][action](args);
    return res.json({ data: result });
  } catch (error: any) {
    console.error('DB Query Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
