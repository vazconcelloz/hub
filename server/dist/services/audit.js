"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const db_1 = require("../db");
exports.AuditService = {
    async log({ userId, action, entity, entityId, details }) {
        try {
            await db_1.prisma.auditLog.create({
                data: {
                    user_id: userId || null,
                    action,
                    entity,
                    entity_id: entityId || null,
                    details: details ? details : undefined,
                },
            });
        }
        catch (error) {
            // Falhas de auditoria não devem travar o sistema principal,
            // mas devem ser logadas no console ou Sentry
            console.error('[AuditService] Falha ao registrar log:', error);
        }
    }
};
