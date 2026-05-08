"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const audit_1 = require("../services/audit");
const router = (0, express_1.Router)();
// Buscar todos os setores, permissões e mapeamento
router.get('/', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, async (req, res, next) => {
    try {
        const [setores, permissoes, setorPermissoes] = await Promise.all([
            db_1.prisma.setor.findMany({ orderBy: { nome: 'asc' } }),
            db_1.prisma.permissao.findMany({ orderBy: { modulo: 'asc' } }),
            db_1.prisma.setorPermissao.findMany()
        ]);
        return res.json({ data: { setores, permissoes, setorPermissoes } });
    }
    catch (error) {
        next(error);
    }
});
// Criar Setor
router.post('/', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, async (req, res, next) => {
    try {
        const { nome, descricao } = req.body;
        const created = await db_1.prisma.setor.create({ data: { nome, descricao } });
        await audit_1.AuditService.log({
            userId: req.user.id,
            action: 'CREATE',
            entity: 'Setor',
            entityId: created.id,
            details: { nome }
        });
        return res.json({ data: created });
    }
    catch (error) {
        next(error);
    }
});
// Excluir Setor
router.delete('/:id', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        await db_1.prisma.setor.delete({ where: { id } });
        await audit_1.AuditService.log({
            userId: req.user.id,
            action: 'DELETE',
            entity: 'Setor',
            entityId: id
        });
        return res.json({ data: { success: true } });
    }
    catch (error) {
        next(error);
    }
});
// Adicionar Permissão ao Setor
router.post('/:id/permissoes', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { permissao_chave } = req.body;
        const created = await db_1.prisma.setorPermissao.create({
            data: { setor_id: id, permissao_chave }
        });
        await audit_1.AuditService.log({
            userId: req.user.id,
            action: 'ADD_PERMISSION',
            entity: 'Setor',
            entityId: id,
            details: { permissao_chave }
        });
        return res.json({ data: created });
    }
    catch (error) {
        next(error);
    }
});
// Remover Permissão do Setor
router.delete('/:id/permissoes/:chave', authMiddleware_1.authMiddleware, authMiddleware_1.requireAdmin, async (req, res, next) => {
    try {
        const { id, chave } = req.params;
        await db_1.prisma.setorPermissao.deleteMany({
            where: { setor_id: id, permissao_chave: chave }
        });
        await audit_1.AuditService.log({
            userId: req.user.id,
            action: 'REMOVE_PERMISSION',
            entity: 'Setor',
            entityId: id,
            details: { permissao_chave: chave }
        });
        return res.json({ data: { success: true } });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
