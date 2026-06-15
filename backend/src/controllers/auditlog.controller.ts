import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { buildPagination } from '../utils/pagination';
import { AuthenticatedRequest } from '../types';

export async function listAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = '1', limit = '50', userId, resource, from, to } = req.query as Record<string, string>;
    const p = Number(page);
    const l = Number(limit);

    const where = {
      ...(userId && { user_id: userId }),
      ...(resource && { resource }),
      ...((from || to) && {
        timestamp: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const [total, logs] = await prisma.$transaction([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip: (p - 1) * l,
        take: l,
        include: {
          user: { select: { id: true, email: true } },
        },
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    res.status(200).json({ success: true, data: logs, meta: buildPagination(total, p, l) });
  } catch (err) {
    next(err);
  }
}
