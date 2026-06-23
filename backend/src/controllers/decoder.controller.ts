import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { buildPagination } from '../utils/pagination';
import { AuthenticatedRequest } from '../types';

export async function listDecoders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = 1, limit = 20, statut, pdvId, type } = req.query as Record<string, string>;
    const p = Number(page);
    const l = Number(limit);

    const where: Prisma.DecoderWhereInput = {
      ...(statut && { statut: statut as import('@prisma/client').DecoderStatut }),
      ...(pdvId && { pdv_id: pdvId }),
      ...(type && { type: { contains: type, mode: 'insensitive' } }),
    };

    const [total, decoders] = await prisma.$transaction([
      prisma.decoder.count({ where }),
      prisma.decoder.findMany({
        where,
        skip: (p - 1) * l,
        take: l,
        include: { pdv: { select: { id: true, name: true, code: true } } },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    res.status(200).json({ success: true, data: decoders, meta: buildPagination(total, p, l) });
  } catch (err) {
    next(err);
  }
}

export async function createDecoder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { serial, type, model } = req.body as { serial: string; type: string; model?: string };
    const decoder = await prisma.decoder.create({ data: { serial, type, model } });
    res.status(201).json({ success: true, data: decoder });
  } catch (err) {
    next(err);
  }
}

export async function getDecoder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const decoder = await prisma.decoder.findUnique({
      where: { id: req.params.id },
      include: { pdv: { select: { id: true, name: true, code: true } } },
    });
    if (!decoder) {
      res.status(404).json({ success: false, message: 'Decoder not found.' });
      return;
    }
    res.status(200).json({ success: true, data: decoder });
  } catch (err) {
    next(err);
  }
}

export async function assignDecoder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { pdvId } = req.body as { pdvId: string };
    const decoder = await prisma.decoder.findUnique({ where: { id: req.params.id } });
    if (!decoder) {
      res.status(404).json({ success: false, message: 'Decoder not found.' });
      return;
    }
    if (decoder.statut !== 'STOCK') {
      res.status(400).json({ success: false, message: 'Decoder is not in stock.' });
      return;
    }
    const updated = await prisma.decoder.update({
      where: { id: req.params.id },
      data: { pdv_id: pdvId, statut: 'DEPLOYED', date_sortie: new Date() },
    });
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function returnDecoder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await prisma.decoder.update({
      where: { id: req.params.id },
      data: { pdv_id: null, statut: 'STOCK', date_sortie: null },
    });
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function updateDecoder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { statut, notes } = req.body as { statut?: string; notes?: string };
    const updated = await prisma.decoder.update({
      where: { id: req.params.id },
      data: {
        ...(statut && { statut: statut as import('@prisma/client').DecoderStatut }),
        ...(notes !== undefined && { notes }),
      },
    });
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
