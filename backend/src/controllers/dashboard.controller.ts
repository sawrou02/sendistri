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

    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      encaissementsJour,
      abonnesActifs,
      decodeurStock,
      versementsEnAttente,
      encaissementsEnAttente,
      objectifCurrentMonth,
      recrutementsMois,
      recentEncaissements,
      encaissementsMoisPrecedent,
      encaissementsMoisCourant,
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
      prisma.encaissement.aggregate({
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
      prisma.encaissement.aggregate({
        where: {
          statut: 'VALIDATED',
          created_at: { gte: lastMonthStart, lt: lastMonthEnd },
          ...(pdvFilter && { pdv_id: pdvFilter }),
        },
        _sum: { montant: true },
      }),
      prisma.encaissement.aggregate({
        where: {
          statut: 'VALIDATED',
          created_at: { gte: thisMonthStart },
          ...(pdvFilter && { pdv_id: pdvFilter }),
        },
        _sum: { montant: true },
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
        encaissements_en_attente: {
          montant: encaissementsEnAttente._sum.montant ?? 0,
          count: encaissementsEnAttente._count,
        },
        evolution_ca: {
          mois_courant: Number(encaissementsMoisCourant._sum.montant ?? 0),
          mois_precedent: Number(encaissementsMoisPrecedent._sum.montant ?? 0),
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

export async function getMonthlyReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const periode = (req.query.periode as string) ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const [year, month] = periode.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const [
      encaissements,
      versements,
      nouveauxAbonnes,
      topPdvsRaw,
      byFormule,
      byMode,
    ] = await Promise.all([
      prisma.encaissement.aggregate({
        where: { statut: 'VALIDATED', created_at: { gte: start, lt: end } },
        _sum: { montant: true },
        _count: true,
      }),
      prisma.versement.aggregate({
        where: { statut: 'CONFIRMED', created_at: { gte: start, lt: end } },
        _sum: { montant: true },
        _count: true,
      }),
      prisma.subscriber.count({
        where: { created_at: { gte: start, lt: end } },
      }),
      prisma.encaissement.groupBy({
        by: ['pdv_id'],
        where: { statut: 'VALIDATED', created_at: { gte: start, lt: end } },
        _sum: { montant: true },
        _count: true,
        orderBy: { _sum: { montant: 'desc' } },
        take: 10,
      }),
      prisma.encaissement.groupBy({
        by: ['formule'],
        where: { statut: 'VALIDATED', created_at: { gte: start, lt: end } },
        _sum: { montant: true },
        _count: true,
      }),
      prisma.encaissement.groupBy({
        by: ['mode_paiement'],
        where: { statut: 'VALIDATED', created_at: { gte: start, lt: end } },
        _sum: { montant: true },
        _count: true,
      }),
    ]);

    const pdvIds = topPdvsRaw.map((g) => g.pdv_id);
    const pdvNames = await prisma.pDV.findMany({ where: { id: { in: pdvIds } }, select: { id: true, name: true, code: true } });
    const pdvMap = new Map(pdvNames.map((p) => [p.id, p]));
    const topPdvs = topPdvsRaw.map((g) => ({
      pdv: pdvMap.get(g.pdv_id) ?? { id: g.pdv_id, name: 'Inconnu', code: '—' },
      montant: Number(g._sum.montant ?? 0),
      count: g._count,
    }));

    res.status(200).json({
      success: true,
      data: {
        periode,
        encaissements: { montant: Number(encaissements._sum.montant ?? 0), count: encaissements._count },
        versements: { montant: Number(versements._sum.montant ?? 0), count: versements._count },
        nouveaux_abonnes: nouveauxAbonnes,
        top_pdvs: topPdvs,
        by_formule: byFormule.map((f) => ({ formule: f.formule, montant: Number(f._sum.montant ?? 0), count: f._count })),
        by_mode: byMode.map((m) => ({ mode: m.mode_paiement, montant: Number(m._sum.montant ?? 0), count: m._count })),
      },
    });
  } catch (err) {
    next(err);
  }
}
