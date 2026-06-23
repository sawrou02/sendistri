import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { buildPagination } from '../utils/pagination';
import { AuthenticatedRequest } from '../types';

export async function listCommissions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = 1, limit = 20, pdvId, statut, periode } = req.query as Record<string, string>;
    const p = Number(page);
    const l = Number(limit);

    const where = {
      ...(pdvId && { pdv_id: pdvId }),
      ...(statut && { statut: statut as import('@prisma/client').CommissionStatut }),
      ...(periode && { periode }),
    };

    const [total, commissions] = await prisma.$transaction([
      prisma.commission.count({ where }),
      prisma.commission.findMany({
        where,
        skip: (p - 1) * l,
        take: l,
        include: { pdv: { select: { id: true, name: true, code: true } } },
        orderBy: { calculated_at: 'desc' },
      }),
    ]);

    res.status(200).json({ success: true, data: commissions, meta: buildPagination(total, p, l) });
  } catch (err) {
    next(err);
  }
}

export async function calculateCommissions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { periode } = req.body as { periode: string };
    if (!/^\d{4}-\d{2}$/.test(periode)) {
      res.status(422).json({ success: false, message: 'Periode must be in YYYY-MM format.' });
      return;
    }

    const [year, month] = periode.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const pdvs = await prisma.pDV.findMany({ where: { statut: 'ACTIVE' }, select: { id: true } });

    const results = await Promise.all(
      pdvs.map(async ({ id: pdvId }) => {
        const agg = await prisma.encaissement.aggregate({
          where: { pdv_id: pdvId, statut: 'VALIDATED', created_at: { gte: start, lt: end } },
          _sum: { montant: true },
          _count: true,
        });

        const montantBase = Number(agg._sum.montant ?? 0);
        const tauxBase = 0.05;
        const montantBaseComm = montantBase * tauxBase;

        const objectif = await prisma.objectif.findFirst({ where: { pdv_id: pdvId, periode } });
        let montantBonus = 0;
        if (objectif && agg._count >= objectif.recrutement_cible && objectif.recrutement_cible > 0) {
          montantBonus = montantBaseComm * 0.1;
        }

        return prisma.commission.upsert({
          where: { pdv_id_periode: { pdv_id: pdvId, periode } },
          create: {
            pdv_id: pdvId,
            periode,
            montant_base: montantBaseComm,
            montant_bonus: montantBonus,
            montant_total: montantBaseComm + montantBonus,
          },
          update: {
            montant_base: montantBaseComm,
            montant_bonus: montantBonus,
            montant_total: montantBaseComm + montantBonus,
            statut: 'CALCULATED',
            calculated_at: new Date(),
          },
        });
      })
    );

    res.status(200).json({ success: true, data: results, message: `${results.length} commissions calculated.` });
  } catch (err) {
    next(err);
  }
}

export async function getCommission(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const commission = await prisma.commission.findUnique({
      where: { id: req.params.id },
      include: { pdv: { select: { id: true, name: true, code: true } } },
    });
    if (!commission) {
      res.status(404).json({ success: false, message: 'Commission not found.' });
      return;
    }
    res.status(200).json({ success: true, data: commission });
  } catch (err) {
    next(err);
  }
}

export async function validateCommission(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const commission = await prisma.commission.findUnique({ where: { id: req.params.id } });
    if (!commission) {
      res.status(404).json({ success: false, message: 'Commission not found.' });
      return;
    }
    if (commission.statut !== 'CALCULATED') {
      res.status(400).json({ success: false, message: 'Commission must be in CALCULATED state to validate.' });
      return;
    }
    const updated = await prisma.commission.update({
      where: { id: req.params.id },
      data: { statut: 'VALIDATED', validated_by: req.user.userId },
    });
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function markCommissionPaid(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const commission = await prisma.commission.findUnique({ where: { id: req.params.id } });
    if (!commission) {
      res.status(404).json({ success: false, message: 'Commission not found.' });
      return;
    }
    if (commission.statut !== 'VALIDATED') {
      res.status(400).json({ success: false, message: 'Commission must be validated before marking as paid.' });
      return;
    }
    const updated = await prisma.commission.update({
      where: { id: req.params.id },
      data: { statut: 'PAID', paid_at: new Date() },
    });
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
