import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { buildPagination } from '../utils/pagination';
import { AuthenticatedRequest } from '../types';

export async function listObjectifs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = '1', limit = '20', pdvId, periode } = req.query as Record<string, string>;
    const p = Number(page);
    const l = Number(limit);

    const where = {
      ...(pdvId && { pdv_id: pdvId }),
      ...(periode && { periode }),
    };

    const [total, objectifs] = await prisma.$transaction([
      prisma.objectif.count({ where }),
      prisma.objectif.findMany({
        where,
        skip: (p - 1) * l,
        take: l,
        include: {
          pdv: { select: { id: true, name: true, code: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    res.status(200).json({ success: true, data: objectifs, meta: buildPagination(total, p, l) });
  } catch (err) {
    next(err);
  }
}

export async function getObjectif(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const objectif = await prisma.objectif.findUnique({
      where: { id: req.params.id },
      include: {
        pdv: { select: { id: true, name: true, code: true } },
      },
    });
    if (!objectif) {
      res.status(404).json({ success: false, message: 'Objectif not found.' });
      return;
    }
    res.status(200).json({ success: true, data: objectif });
  } catch (err) {
    next(err);
  }
}

export async function createObjectif(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { pdvId, periode, recrutement_cible, reabonnement_cible, ca_cible } = req.body as {
      pdvId?: string | null;
      periode: string;
      recrutement_cible: number;
      reabonnement_cible: number;
      ca_cible: number;
    };

    const objectif = await prisma.objectif.create({
      data: {
        pdv_id: pdvId ?? null,
        periode,
        recrutement_cible,
        reabonnement_cible,
        ca_cible,
      },
    });

    res.status(201).json({ success: true, data: objectif });
  } catch (err) {
    next(err);
  }
}

export async function updateObjectif(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { recrutement_cible, reabonnement_cible, ca_cible } = req.body as {
      recrutement_cible?: number;
      reabonnement_cible?: number;
      ca_cible?: number;
    };

    const objectif = await prisma.objectif.update({
      where: { id: req.params.id },
      data: {
        ...(recrutement_cible !== undefined && { recrutement_cible }),
        ...(reabonnement_cible !== undefined && { reabonnement_cible }),
        ...(ca_cible !== undefined && { ca_cible }),
      },
    });

    res.status(200).json({ success: true, data: objectif });
  } catch (err) {
    next(err);
  }
}

export async function deleteObjectif(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.objectif.delete({ where: { id: req.params.id } });
    res.status(200).json({ success: true, message: 'Objectif deleted successfully.' });
  } catch (err) {
    next(err);
  }
}
