import { Router } from 'express';
import { prisma } from '../db';
import { authMiddleware, requireAdmin } from '../middlewares/authMiddleware';
import { AuditService } from '../services/audit';

const router = Router();

// Buscar todos os setores, permissões e mapeamento
router.get('/', authMiddleware, requireAdmin, async (req: any, res: any, next: any) => {
  try {
    const [setores, permissoes, setorPermissoes] = await Promise.all([
      prisma.setor.findMany({ orderBy: { nome: 'asc' } }),
      prisma.permissao.findMany({ orderBy: { modulo: 'asc' } }),
      prisma.setorPermissao.findMany()
    ]);
    
    return res.json({ data: { setores, permissoes, setorPermissoes } });
  } catch (error) {
    next(error);
  }
});

// Criar Setor
router.post('/', authMiddleware, requireAdmin, async (req: any, res: any, next: any) => {
  try {
    const { nome, descricao } = req.body;
    const created = await prisma.setor.create({ data: { nome, descricao } });
    
    await AuditService.log({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'Setor',
      entityId: created.id,
      details: { nome }
    });

    return res.json({ data: created });
  } catch (error) {
    next(error);
  }
});

// Excluir Setor
router.delete('/:id', authMiddleware, requireAdmin, async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    await prisma.setor.delete({ where: { id } });
    
    await AuditService.log({
      userId: req.user.id,
      action: 'DELETE',
      entity: 'Setor',
      entityId: id
    });

    return res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

// Adicionar Permissão ao Setor
router.post('/:id/permissoes', authMiddleware, requireAdmin, async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { permissao_chave } = req.body;
    const created = await prisma.setorPermissao.create({
      data: { setor_id: id, permissao_chave }
    });
    
    await AuditService.log({
      userId: req.user.id,
      action: 'ADD_PERMISSION',
      entity: 'Setor',
      entityId: id,
      details: { permissao_chave }
    });

    return res.json({ data: created });
  } catch (error) {
    next(error);
  }
});

// Remover Permissão do Setor
router.delete('/:id/permissoes/:chave', authMiddleware, requireAdmin, async (req: any, res: any, next: any) => {
  try {
    const { id, chave } = req.params;
    await prisma.setorPermissao.deleteMany({
      where: { setor_id: id, permissao_chave: chave }
    });
    
    await AuditService.log({
      userId: req.user.id,
      action: 'REMOVE_PERMISSION',
      entity: 'Setor',
      entityId: id,
      details: { permissao_chave: chave }
    });

    return res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
