import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { buildPagination } from '../utils/pagination';
import { AuthenticatedRequest, UserRole } from '../types';
import { broadcastToRoles } from '../sse/notificationHub';

export async function listEncaissements(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = 1, limit = 20, pdvId, statut, type, from, to } = req.query as Record<string, string>;
    const p = Number(page);
    const l = Number(limit);

    const effectivePdvId = req.user.role === UserRole.PDV_OPERATOR ? req.user.pdvId : pdvId;

    const where: Prisma.EncaissementWhereInput = {
      ...(effectivePdvId && { pdv_id: effectivePdvId }),
      ...(statut && { statut: statut as import('@prisma/client').EncaissementStatut }),
      ...(type && { type: type as import('@prisma/client').EncaissementType }),
      ...((from || to) && {
        created_at: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const [total, encaissements] = await prisma.$transaction([
      prisma.encaissement.count({ where }),
      prisma.encaissement.findMany({
        where,
        skip: (p - 1) * l,
        take: l,
        include: {
          pdv: { select: { id: true, name: true, code: true } },
          subscriber: { select: { id: true, nom: true, prenom: true, code: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    res.status(200).json({ success: true, data: encaissements, meta: buildPagination(total, p, l) });
  } catch (err) {
    next(err);
  }
}

export async function createEncaissement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { pdvId, type, subscriberId, formule, duree, montant, modePaiement, options } = req.body as {
      pdvId: string; type: string; subscriberId?: string; formule: string;
      duree: number; montant: number; modePaiement: string; options?: Record<string, unknown>;
    };

    if (req.user.role === UserRole.PDV_OPERATOR && req.user.pdvId !== pdvId) {
      res.status(403).json({ success: false, message: 'Cannot create encaissement for another PDV.' });
      return;
    }

    const encaissement = await prisma.encaissement.create({
      data: {
        pdv_id: pdvId,
        type: type as import('@prisma/client').EncaissementType,
        subscriber_id: subscriberId,
        formule: formule as import('@prisma/client').Formule,
        duree,
        montant,
        mode_paiement: modePaiement as import('@prisma/client').ModePaiement,
        options: options as import('@prisma/client').Prisma.InputJsonValue | undefined,
        created_by: req.user.userId,
      },
    });
    broadcastToRoles(['SUPER', 'ADMIN', 'ACCOUNTANT'], 'encaissement:pending', {
      id: encaissement.id,
      montant: Number(encaissement.montant),
      pdv_id: encaissement.pdv_id,
      formule: encaissement.formule,
      type: encaissement.type,
    });
    res.status(201).json({ success: true, data: encaissement });
  } catch (err) {
    next(err);
  }
}

export async function getEncaissement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const enc = await prisma.encaissement.findUnique({
      where: { id: req.params.id },
      include: {
        pdv: { select: { id: true, name: true, code: true } },
        subscriber: { select: { id: true, nom: true, prenom: true, code: true } },
        created_by_user: { select: { id: true, email: true } },
        validated_by_user: { select: { id: true, email: true } },
      },
    });
    if (!enc) {
      res.status(404).json({ success: false, message: 'Encaissement not found.' });
      return;
    }
    if (req.user.role === UserRole.PDV_OPERATOR && enc.pdv_id !== req.user.pdvId) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }
    res.status(200).json({ success: true, data: enc });
  } catch (err) {
    next(err);
  }
}

export async function exportEncaissementsCsv(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { pdvId, statut, type, from, to } = req.query as Record<string, string>;
    const effectivePdvId = req.user.role === UserRole.PDV_OPERATOR ? req.user.pdvId : pdvId;

    const where: Prisma.EncaissementWhereInput = {
      ...(effectivePdvId && { pdv_id: effectivePdvId }),
      ...(statut && { statut: statut as import('@prisma/client').EncaissementStatut }),
      ...(type && { type: type as import('@prisma/client').EncaissementType }),
      ...((from || to) && {
        created_at: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const rows = await prisma.encaissement.findMany({
      where,
      include: {
        pdv: { select: { name: true, code: true } },
        subscriber: { select: { nom: true, prenom: true, code: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 10000,
    });

    const header = 'Date,PDV,Type,Formule,Durée,Montant,Mode,Statut,Abonné\n';
    const lines = rows.map((r) => {
      const date = r.created_at.toISOString().slice(0, 10);
      const pdv = `${r.pdv?.code ?? ''} ${r.pdv?.name ?? ''}`.trim();
      const subscriber = r.subscriber ? `${r.subscriber.prenom} ${r.subscriber.nom}` : '';
      return [date, pdv, r.type, r.formule, r.duree, r.montant, r.mode_paiement, r.statut, subscriber]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
    });

    const csv = header + lines.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="encaissements-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send('﻿' + csv);
  } catch (err) {
    next(err);
  }
}

export async function validateEncaissement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { statut } = req.body as { statut: 'VALIDATED' | 'REJECTED' };
    const enc = await prisma.encaissement.findUnique({ where: { id: req.params.id } });
    if (!enc) {
      res.status(404).json({ success: false, message: 'Encaissement not found.' });
      return;
    }
    if (enc.statut !== 'PENDING') {
      res.status(400).json({ success: false, message: 'Encaissement already processed.' });
      return;
    }

    const updated = await prisma.encaissement.update({
      where: { id: req.params.id },
      data: { statut, validated_by: req.user.userId, validated_at: new Date() },
    });
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
