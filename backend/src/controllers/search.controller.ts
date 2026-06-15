import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest, UserRole } from '../types';

export async function globalSearch(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = ((req.query.q as string) ?? '').trim();
    if (q.length < 2) {
      res.status(200).json({ success: true, data: { pdvs: [], subscribers: [], encaissements: [] } });
      return;
    }

    const pdvFilter = req.user.role === UserRole.PDV_OPERATOR ? req.user.pdvId : undefined;

    const [pdvs, subscribers, encaissements] = await Promise.all([
      pdvFilter
        ? Promise.resolve([])
        : prisma.pDV.findMany({
            where: {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { code: { contains: q, mode: 'insensitive' } },
              ],
            },
            take: 5,
            select: { id: true, name: true, code: true, statut: true },
          }),
      prisma.subscriber.findMany({
        where: {
          ...(pdvFilter && { pdv_id: pdvFilter }),
          OR: [
            { nom: { contains: q, mode: 'insensitive' } },
            { prenom: { contains: q, mode: 'insensitive' } },
            { code: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, nom: true, prenom: true, code: true, formule: true, statut: true },
      }),
      prisma.encaissement.findMany({
        where: {
          ...(pdvFilter && { pdv_id: pdvFilter }),
          pdv: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }] },
        },
        take: 5,
        select: { id: true, montant: true, formule: true, statut: true, created_at: true, pdv: { select: { name: true } } },
      }),
    ]);

    res.status(200).json({ success: true, data: { pdvs, subscribers, encaissements } });
  } catch (err) {
    next(err);
  }
}
