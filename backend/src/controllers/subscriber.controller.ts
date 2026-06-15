import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AuthenticatedRequest, UserRole } from '../types';

export const getSubscribers = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const page = parseInt((req.query.page as string) || '1') || 1;
    const limit = parseInt((req.query.limit as string) || '20') || 20;
    const search = req.query.search as string | undefined;
    const statut = req.query.statut as string | undefined;
    const formule = req.query.formule as string | undefined;
    let pdvId = req.query.pdvId as string | undefined;

    if (authReq.user.role === UserRole.PDV_OPERATOR) {
      pdvId = authReq.user.pdvId;
    }

    const skip = (page - 1) * Number(limit);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (pdvId) where.pdv_id = pdvId;
    if (statut) where.statut = statut;
    if (formule) where.formule = formule;

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [total, subscribers] = await Promise.all([
      prisma.subscriber.count({ where }),
      prisma.subscriber.findMany({
        where,
        skip,
        take: Number(limit),
        include: { pdv: { select: { id: true, code: true, name: true } } },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        subscribers,
        pagination: {
          page,
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Error in getSubscribers:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createSubscriber = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const {
      code,
      nom,
      prenom,
      phone,
      pdvId,
      formule,
      date_abo,
    }: {
      code: string;
      nom: string;
      prenom: string;
      phone: string;
      pdvId: string;
      formule: string;
      date_abo: string;
    } = req.body;

    const effectivePdvId =
      authReq.user.role === UserRole.PDV_OPERATOR ? authReq.user.pdvId! : pdvId;

    if (authReq.user.role === UserRole.PDV_OPERATOR && authReq.user.pdvId !== pdvId) {
      res.status(403).json({ success: false, message: 'Cannot create subscriber for another PDV' });
      return;
    }

    const subscriber = await prisma.subscriber.create({
      data: {
        code,
        nom,
        prenom,
        phone,
        pdv_id: effectivePdvId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formule: formule as any,
        date_abo: new Date(date_abo),
      },
    });

    res.status(201).json({ success: true, data: subscriber });
  } catch (error) {
    logger.error('Error in createSubscriber:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getSubscriberById = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    const subscriber = await prisma.subscriber.findUnique({
      where: { id },
      include: { pdv: { select: { id: true, code: true, name: true } } },
    });

    if (!subscriber) {
      res.status(404).json({ success: false, message: 'Subscriber not found' });
      return;
    }

    if (
      authReq.user.role === UserRole.PDV_OPERATOR &&
      subscriber.pdv_id !== authReq.user.pdvId
    ) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    res.json({ success: true, data: subscriber });
  } catch (error) {
    logger.error('Error in getSubscriberById:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateSubscriber = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    const existing = await prisma.subscriber.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Subscriber not found' });
      return;
    }

    if (
      authReq.user.role === UserRole.PDV_OPERATOR &&
      existing.pdv_id !== authReq.user.pdvId
    ) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const {
      nom,
      prenom,
      phone,
      formule,
      statut,
      date_abo,
      date_expiry,
    }: Partial<{
      nom: string;
      prenom: string;
      phone: string;
      formule: string;
      statut: string;
      date_abo: string;
      date_expiry: string;
    }> = req.body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    if (nom !== undefined) updateData.nom = nom;
    if (prenom !== undefined) updateData.prenom = prenom;
    if (phone !== undefined) updateData.phone = phone;
    if (formule !== undefined) updateData.formule = formule;
    if (statut !== undefined) updateData.statut = statut;
    if (date_abo !== undefined) updateData.date_abo = new Date(date_abo);
    if (date_expiry !== undefined) updateData.date_expiry = new Date(date_expiry);

    const subscriber = await prisma.subscriber.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: subscriber });
  } catch (error) {
    logger.error('Error in updateSubscriber:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getSubscriberSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    const subscriber = await prisma.subscriber.findUnique({ where: { id } });
    if (!subscriber) {
      res.status(404).json({ success: false, message: 'Subscriber not found' });
      return;
    }

    if (
      authReq.user.role === UserRole.PDV_OPERATOR &&
      subscriber.pdv_id !== authReq.user.pdvId
    ) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { subscriber_id: id },
      include: {
        recorded_by: {
          select: { name: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json({ success: true, data: subscriptions });
  } catch (error) {
    logger.error('Error in getSubscriberSubscriptions:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
