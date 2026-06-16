import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { buildPagination } from '../utils/pagination';
import { AuthenticatedRequest, UserRole } from '../types';

export const getPdvs = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const page = parseInt((req.query.page as string) || '1') || 1;
    const limit = parseInt((req.query.limit as string) || '20') || 20;
    const search = req.query.search as string | undefined;
    const statut = req.query.statut as string | undefined;
    const region = req.query.region as string | undefined;
    const type = req.query.type as string | undefined;

    const skip = (page - 1) * Number(limit);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (authReq.user.role === UserRole.PDV_OPERATOR) {
      where.id = authReq.user.pdvId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (statut) where.statut = statut;
    if (region) where.region = { contains: region, mode: 'insensitive' };
    if (type) where.type = type;

    const [total, pdvs] = await Promise.all([
      prisma.pDV.count({ where }),
      prisma.pDV.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { created_at: 'desc' },
      }),
    ]);

    res.json({
      success: true,
      data: pdvs,
      meta: buildPagination(total, page, Number(limit)),
    });
  } catch (error) {
    logger.error('Error in getPdvs:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createPdv = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      code,
      name,
      type,
      secteur,
      region,
      phone,
      email,
      caution,
    }: {
      code: string;
      name: string;
      type: string;
      secteur: string;
      region: string;
      phone?: string;
      email?: string;
      caution: number;
    } = req.body;

    const pdv = await prisma.pDV.create({
      data: {
        code,
        name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: type as any,
        secteur,
        region,
        phone: phone ?? null,
        email: email ?? null,
        caution,
        statut: 'ACTIVE' as any,
      },
    });

    res.status(201).json({ success: true, data: pdv });
  } catch (error) {
    logger.error('Error in createPdv:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getPdvById = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    if (authReq.user.role === UserRole.PDV_OPERATOR && authReq.user.pdvId !== id) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const pdv = await prisma.pDV.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subscribers: true,
            encaissements: true,
            decoders: true,
          },
        },
      },
    });

    if (!pdv) {
      res.status(404).json({ success: false, message: 'PDV not found' });
      return;
    }

    res.json({ success: true, data: pdv });
  } catch (error) {
    logger.error('Error in getPdvById:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updatePdv = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.pDV.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'PDV not found' });
      return;
    }

    const {
      code,
      name,
      type,
      secteur,
      region,
      phone,
      email,
      caution,
      statut,
    }: Partial<{
      code: string;
      name: string;
      type: string;
      secteur: string;
      region: string;
      phone: string;
      email: string;
      caution: number;
      statut: string;
    }> = req.body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (secteur !== undefined) updateData.secteur = secteur;
    if (region !== undefined) updateData.region = region;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (caution !== undefined) updateData.caution = caution;
    if (statut !== undefined) updateData.statut = statut;

    const pdv = await prisma.pDV.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: pdv });
  } catch (error) {
    logger.error('Error in updatePdv:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deletePdv = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.pDV.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'PDV not found' });
      return;
    }

    await prisma.pDV.update({
      where: { id },
      data: { statut: 'INACTIVE' as any },
    });

    res.json({ success: true, message: 'PDV deactivated' });
  } catch (error) {
    logger.error('Error in deletePdv:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getPdvStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    if (authReq.user.role === UserRole.PDV_OPERATOR && authReq.user.pdvId !== id) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const existing = await prisma.pDV.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'PDV not found' });
      return;
    }

    const [
      totalSubscribers,
      activeSubscribers,
      encaissementsAgg,
      pendingEncaissements,
      versementsAgg,
      decodersByStatut,
    ] = await Promise.all([
      prisma.subscriber.count({ where: { pdv_id: id } }),
      prisma.subscriber.count({ where: { pdv_id: id, statut: 'ACTIVE' } }),
      prisma.encaissement.aggregate({
        where: { pdv_id: id },
        _count: { id: true },
        _sum: { montant: true },
      }),
      prisma.encaissement.count({ where: { pdv_id: id, statut: 'PENDING' } }),
      prisma.versement.aggregate({
        where: { pdv_id: id },
        _sum: { montant: true },
      }),
      prisma.decoder.groupBy({
        by: ['statut'],
        where: { pdv_id: id },
        _count: { id: true },
      }),
    ]);

    const decoderStats: Record<string, number> = {};
    for (const group of decodersByStatut) {
      decoderStats[group.statut] = group._count.id;
    }

    res.json({
      success: true,
      data: {
        subscribers: {
          total: totalSubscribers,
          active: activeSubscribers,
        },
        encaissements: {
          count: encaissementsAgg._count.id,
          totalMontant: encaissementsAgg._sum.montant ?? 0,
          pending: pendingEncaissements,
        },
        versements: {
          total: versementsAgg._sum.montant ?? 0,
        },
        decoders: decoderStats,
      },
    });
  } catch (error) {
    logger.error('Error in getPdvStats:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
