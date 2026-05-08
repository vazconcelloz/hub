import { Router } from 'express';
import { prisma } from '../db';
import { authMiddleware, AuthRequest } from '../middlewares/authMiddleware';

const router = Router();

// Middleware para checar se é admin
const requireAdmin = (req: AuthRequest, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito para administradores.' });
  }
  next();
};

// Alterar cargo do usuário
router.put('/:id/role', authMiddleware, requireAdmin, async (req: AuthRequest, res: any) => {
  try {
    const userId = req.params.id as string;
    const { role } = req.body;

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Cargo inválido' });
    }

    await prisma.userRole.deleteMany({ where: { user_id: userId } });
    const updated = await prisma.userRole.create({ data: { user_id: userId, role } });
    
    return res.json({ data: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Adicionar setor ao usuário
router.post('/:id/setor', authMiddleware, requireAdmin, async (req: AuthRequest, res: any) => {
  try {
    const userId = req.params.id as string;
    const { setorId } = req.body;
    
    const created = await prisma.userSetor.create({
      data: { user_id: userId, setor_id: setorId }
    });
    
    return res.json({ data: created });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Remover setor do usuário
router.delete('/:id/setor/:setorId', authMiddleware, requireAdmin, async (req: AuthRequest, res: any) => {
  try {
    const userId = req.params.id as string;
    const setorId = req.params.setorId as string;
    
    await prisma.userSetor.deleteMany({
      where: { user_id: userId, setor_id: setorId }
    });
    
    return res.json({ data: { success: true } });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Atualizar permissão individual
router.put('/:id/permissao', authMiddleware, requireAdmin, async (req: AuthRequest, res: any) => {
  try {
    const userId = req.params.id as string;
    const { permissao_chave, concedida } = req.body;
    
    const upserted = await prisma.userPermissao.upsert({
      where: {
        user_id_permissao_chave: {
          user_id: userId,
          permissao_chave: permissao_chave as string
        }
      },
      update: { concedida },
      create: { user_id: userId, permissao_chave: permissao_chave as string, concedida }
    });
    
    return res.json({ data: upserted });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Revogar permissão individual (voltar para herdado)
router.delete('/:id/permissao/:chave', authMiddleware, requireAdmin, async (req: AuthRequest, res: any) => {
  try {
    const userId = req.params.id as string;
    const chave = req.params.chave as string;
    
    await prisma.userPermissao.deleteMany({
      where: { user_id: userId, permissao_chave: chave }
    });
    
    return res.json({ data: { success: true } });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
