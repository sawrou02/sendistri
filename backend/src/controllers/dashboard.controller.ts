import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest, UserRole } from '../types';

export async function getKpis(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const pdvFilter = req.user.role === UserRole.PDV_OPERATOR ? req.user.pdvId : undefined;

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const [
      encaissementsJour,
      abonnesActifs,
      decodeurStock,
      versementsEnAttente,
      objectifCurrentMonth,
      recrutementsMois,
      recentEncaissements,
    ] = await prisma.$transaction([
      prisma.encaissement.aggregate({
        where: {
          statut: 'VALIDATED',
          created_at: { gte: startOfDay, lt: endOfDay },
          ...(pdvFilter && { pdv_id: pdvFilter }),
        },
        _sum: { montant: true },
        _count: true,
      }),
      prisma.subscriber.count({
        where: { statut: 'ACTIVE', ...(pdvFilter && { pdv_id: pdvFilter }) },
      }),
      prisma.decoder.count({ where: { statut: 'STOCK' } }),
      prisma.versement.aggregate({
        where: { statut: 'PENDING', ...(pdvFilter && { pdv_id: pdvFilter }) },
        _sum: { montant: true },
        _count: true,
      }),
      prisma.objectif.findFirst({
        where: { periode: currentMonth, ...(pdvFilter ? { pdv_id: pdvFilter } : { pdv_id: null }) },
      }),
      prisma.encaissement.count({
        where: {
          type: 'RECRUTEMENT',
          statut: 'VALIDATED',
          created_at: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
          ...(pdvFilter && { pdv_id: pdvFilter }),
        },
      }),
      prisma.encaissement.findMany({
        where: { ...(pdvFilter && { pdv_id: pdvFilter }) },
        take: 10,
        orderBy: { created_at: 'desc' },
        include: { pdv: { select: { name: true, code: true } } },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        encaissements_jour: {
          montant: encaissementsJour._sum.montant ?? 0,
          count: encaissementsJour._count,
        },
        abonnes_actifs: abonnesActifs,
        decodeurs_stock: decodeurStock,
        versements_en_attente: {
          montant: versementsEnAttente._sum.montant ?? 0,
          count: versementsEnAttente._count,
        },
        objectif_recrutement: {
          recrutes: recrutementsMois,
          cible: objectifCurrentMonth?.recrutement_cible ?? 0,
          taux:
            objectifCurrentMonth?.recrutement_cible
              ? Math.round((recrutementsMois / objectifCurrentMonth.recrutement_cible) * 100)
              : 0,
        },
        recent_encaissements: recentEncaissements,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getCharts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const pdvFilter = req.user.role === UserRole.PDV_OPERATOR ? req.user.pdvId : undefined;

    const today = new Date();
    const twelveMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 11, 1);

    // Raw rows for the last 12 months, grouped by month in JS (groupBy on a
    // raw timestamp would create one bucket per row, which is useless).
    const rows = await prisma.encaissement.findMany({
      where: {
        statut: 'VALIDATED',
        created_at: { gte: twelveMonthsAgo },
        ...(pdvFilter && { pdv_id: pdvFilter }),
      },
      select: { montant: true, created_at: true },
    });

    const monthlyMap = new Map<string, { montant: number; count: number }>();
    for (const r of rows) {
      const key = `${r.created_at.getFullYear()}-${String(r.created_at.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthlyMap.get(key) ?? { montant: 0, count: 0 };
      entry.montant += Number(r.montant);
      entry.count += 1;
      monthlyMap.set(key, entry);
    }
    const monthly = Array.from(monthlyMap.entries())
      .map(([periode, v]) => ({ periode, ...v }))
      .sort((a, b) => a.periode.localeCompare(b.periode));

    const byFormule = await prisma.encaissement.groupBy({
      by: ['formule'],
      where: {
        statut: 'VALIDATED',
        ...(pdvFilter && { pdv_id: pdvFilter }),
      },
      _sum: { montant: true },
      _count: true,
    });

    let topPdvs: Array<{ pdv_id: string; name: string; montant: number }> = [];
    if (!pdvFilter) {
      const grouped = await prisma.encaissement.groupBy({
        by: ['pdv_id'],
        where: { statut: 'VALIDATED' },
        _sum: { montant: true },
        orderBy: { _sum: { montant: 'desc' } },
        take: 10,
      });
      const pdvs = await prisma.pDV.findMany({
        where: { id: { in: grouped.map((g) => g.pdv_id) } },
        select: { id: true, name: true },
      });
      const nameById = new Map(pdvs.map((p) => [p.id, p.name]));
      topPdvs = grouped.map((g) => ({
        pdv_id: g.pdv_id,
        name: nameById.get(g.pdv_id) ?? 'Inconnu',
        montant: Number(g._sum.montant ?? 0),
      }));
    }

    res.status(200).json({
      success: true,
      data: { monthly, byFormule, topPdvs },
    });
  } catch (err) {
    next(err);
  }
}
