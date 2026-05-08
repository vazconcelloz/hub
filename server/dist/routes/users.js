"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Middleware para checar se é admin
const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso restrito para administradores.' });
    }
    next();
};
// Alterar cargo do usuário
router.put('/:id/role', authMiddleware_1.authMiddleware, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;
        if (!['admin', 'user'].includes(role)) {
            return res.status(400).json({ error: 'Cargo inválido' });
        }
        await db_1.prisma.userRole.deleteMany({ where: { user_id: userId } });
        const updated = await db_1.prisma.userRole.create({ data: { user_id: userId, role } });
        return res.json({ data: updated });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// Adicionar setor ao usuário
router.post('/:id/setor', authMiddleware_1.authMiddleware, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { setorId } = req.body;
        const created = await db_1.prisma.userSetor.create({
            data: { user_id: userId, setor_id: setorId }
        });
        return res.json({ data: created });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// Remover setor do usuário
router.delete('/:id/setor/:setorId', authMiddleware_1.authMiddleware, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const setorId = req.params.setorId;
        await db_1.prisma.userSetor.deleteMany({
            where: { user_id: userId, setor_id: setorId }
        });
        return res.json({ data: { success: true } });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// Atualizar permissão individual
router.put('/:id/permissao', authMiddleware_1.authMiddleware, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { permissao_chave, concedida } = req.body;
        const upserted = await db_1.prisma.userPermissao.upsert({
            where: {
                user_id_permissao_chave: {
                    user_id: userId,
                    permissao_chave: permissao_chave
                }
            },
            update: { concedida },
            create: { user_id: userId, permissao_chave: permissao_chave, concedida }
        });
        return res.json({ data: upserted });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// Revogar permissão individual (voltar para herdado)
router.delete('/:id/permissao/:chave', authMiddleware_1.authMiddleware, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const chave = req.params.chave;
        await db_1.prisma.userPermissao.deleteMany({
            where: { user_id: userId, permissao_chave: chave }
        });
        return res.json({ data: { success: true } });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
exports.default = router;
