import { prisma } from '../db';

interface AuditParams {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

export const AuditService = {
  async log({ userId, action, entity, entityId, details }: AuditParams) {
    try {
      await prisma.auditLog.create({
        data: {
          user_id: userId || null,
          action,
          entity,
          entity_id: entityId || null,
          details: details ? (details as any) : undefined,
        },
      });
    } catch (error) {
      // Falhas de auditoria não devem travar o sistema principal,
      // mas devem ser logadas no console ou Sentry
      console.error('[AuditService] Falha ao registrar log:', error);
    }
  }
};
