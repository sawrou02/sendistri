import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { buildPagination } from '../utils/pagination';
import { AuthenticatedRequest, UserRole } from '../types';

export async function listVersements(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = 1, limit = 20, pdvId, statut, from, to } = req.query as Record<string, string>;
    const p = Number(page);
    const l = Number(limit);

    const effectivePdvId = req.user.role === UserRole.PDV_OPERATOR ? req.user.pdvId : pdvId;

    const where: Prisma.VersementWhereInput = {
      ...(effectivePdvId && { pdv_id: effectivePdvId }),
      ...(statut && { statut: statut as import('@prisma/client').VersementStatut }),
      ...((from || to) && {
        created_at: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const [total, versements] = await prisma.$transaction([
      prisma.versement.count({ where }),
      prisma.versement.findMany({
        where,
        skip: (p - 1) * l,
        take: l,
        include: { pdv: { select: { id: true, name: true, code: true } } },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    res.status(200).json({ success: true, data: versements, meta: buildPagination(total, p, l) });
  } catch (err) {
    next(err);
  }
}

export async function createVersement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { pdvId, montant, banque, bordereau } = req.body as {
      pdvId: string; montant: number; banque: string; bordereau: string;
    };

    if (req.user.role === UserRole.PDV_OPERATOR && req.user.pdvId !== pdvId) {
      res.status(403).json({ success: false, message: 'Cannot create versement for another PDV.' });
      return;
    }

    const versement = await prisma.versement.create({
      data: { pdv_id: pdvId, montant, banque, bordereau, created_by: req.user.userId },
    });
    res.status(201).json({ success: true, data: versement });
  } catch (err) {
    next(err);
  }
}

export async function getVersement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const versement = await prisma.versement.findUnique({
      where: { id: req.params.id },
      include: {
        pdv: { select: { id: true, name: true, code: true } },
        confirmed_by_user: { select: { id: true, email: true } },
      },
    });
    if (!versement) {
      res.status(404).json({ success: false, message: 'Versement not found.' });
      return;
    }
    if (req.user.role === UserRole.PDV_OPERATOR && versement.pdv_id !== req.user.pdvId) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }
    res.status(200).json({ success: true, data: versement });
  } catch (err) {
    next(err);
  }
}

export async function confirmVersement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { statut } = req.body as { statut: 'CONFIRMED' | 'REJECTED' };
    const versement = await prisma.versement.findUnique({ where: { id: req.params.id } });
    if (!versement) {
      res.status(404).json({ success: false, message: 'Versement not found.' });
      return;
    }
    if (versement.statut !== 'PENDING') {
      res.status(400).json({ success: false, message: 'Versement already processed.' });
      return;
    }

    const updated = await prisma.versement.update({
      where: { id: req.params.id },
      data: { statut, confirmed_by: req.user.userId, confirmed_at: new Date() },
    });
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
