import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { comparePassword, hashPassword, hashToken, generateSecureToken } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../types';
import { env } from '../config/env';

const COOKIE_NAME = 'refreshToken';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.is_active) {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
      return;
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
      return;
    }

    const payload = { userId: user.id, role: user.role as import('../types').UserRole, pdvId: user.pdv_id ?? undefined };
    const accessToken = signAccessToken(payload);
    const rawRefresh = generateSecureToken();
    const tokenHash = hashToken(rawRefresh);

    await prisma.$transaction([
      prisma.refreshToken.create({
        data: {
          user_id: user.id,
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.user.update({ where: { id: user.id }, data: { last_login: new Date() } }),
    ]);

    res.cookie(COOKIE_NAME, rawRefresh, COOKIE_OPTS);
    res.status(200).json({
      success: true,
      data: {
        accessToken,
        user: { id: user.id, email: user.email, role: user.role, pdvId: user.pdv_id },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const raw: string | undefined = req.cookies[COOKIE_NAME];
    if (!raw) {
      res.status(401).json({ success: false, message: 'No refresh token.' });
      return;
    }

    let payload: import('../types').JwtPayload;
    try {
      payload = verifyRefreshToken(raw);
    } catch {
      res.status(401).json({ success: false, message: 'Invalid refresh token.' });
      return;
    }

    const hash = hashToken(raw);
    const stored = await prisma.refreshToken.findUnique({ where: { token_hash: hash } });
    if (!stored || stored.revoked || stored.expires_at < new Date()) {
      res.clearCookie(COOKIE_NAME, { path: '/api/v1/auth' });
      res.status(401).json({ success: false, message: 'Refresh token expired or revoked.' });
      return;
    }

    const newRaw = generateSecureToken();
    const newHash = hashToken(newRaw);

    await prisma.$transaction([
      prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } }),
      prisma.refreshToken.create({
        data: {
          user_id: stored.user_id,
          token_hash: newHash,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    const accessToken = signAccessToken(payload);
    res.cookie(COOKIE_NAME, newRaw, COOKIE_OPTS);
    res.status(200).json({ success: true, data: { accessToken } });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const raw: string | undefined = req.cookies[COOKIE_NAME];
    if (raw) {
      const hash = hashToken(raw);
      await prisma.refreshToken.updateMany({ where: { token_hash: hash }, data: { revoked: true } });
    }
    res.clearCookie(COOKIE_NAME, { path: '/api/v1/auth' });
    res.status(200).json({ success: true, message: 'Logged out.' });
  } catch (err) {
    next(err);
  }
}

export async function me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, role: true, pdv_id: true, last_login: true, created_at: true },
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

export async function changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const valid = await comparePassword(currentPassword, user.password_hash);
    if (!valid) {
      res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      return;
    }

    const newHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password_hash: newHash } }),
      prisma.refreshToken.updateMany({ where: { user_id: user.id }, data: { revoked: true } }),
    ]);

    res.clearCookie(COOKIE_NAME, { path: '/api/v1/auth' });
    res.status(200).json({ success: true, message: 'Password changed. Please log in again.' });
  } catch (err) {
    next(err);
  }
}
