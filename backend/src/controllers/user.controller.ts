import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { hashPassword } from '../utils/password';
import { buildPagination } from '../utils/pagination';
import { AuthenticatedRequest } from '../types';

export async function listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = 1, limit = 20, search } = req.query as { page?: number; limit?: number; search?: string };
    const where = search
      ? { email: { contains: search, mode: 'insensitive' as const } }
      : {};

    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, email: true, role: true, pdv_id: true, is_active: true, last_login: true, created_at: true },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    res.status(200).json({ success: true, data: users, meta: buildPagination(total, page, limit) });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, role, pdvId } = req.body as { email: string; password: string; role: string; pdvId?: string };
    const hash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, password_hash: hash, role: role as import('@prisma/client').Role, pdv_id: pdvId },
      select: { id: true, email: true, role: true, pdv_id: true, is_active: true, created_at: true },
    });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, role: true, pdv_id: true, is_active: true, last_login: true, created_at: true },
    });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, role, pdvId, is_active } = req.body as { email?: string; role?: string; pdvId?: string | null; is_active?: boolean };
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(email && { email }),
        ...(role && { role: role as import('@prisma/client').Role }),
        ...(pdvId !== undefined && { pdv_id: pdvId }),
        ...(is_active !== undefined && { is_active }),
      },
      select: { id: true, email: true, role: true, pdv_id: true, is_active: true, created_at: true },
    });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function deactivateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.params.id === req.user.userId) {
      res.status(400).json({ success: false, message: 'Cannot deactivate your own account.' });
      return;
    }
    await prisma.user.update({ where: { id: req.params.id }, data: { is_active: false } });
    res.status(200).json({ success: true, message: 'User deactivated.' });
  } catch (err) {
    next(err);
  }
}

export async function resetUserPassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { newPassword } = req.body as { newPassword: string };
    const hash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: req.params.id }, data: { password_hash: hash } }),
      prisma.refreshToken.updateMany({ where: { user_id: req.params.id }, data: { revoked: true } }),
    ]);
    res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    next(err);
  }
}
