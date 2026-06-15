import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export function auditLog(req: Request, res: Response, next: NextFunction): void {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const userId = (req as AuthenticatedRequest).user?.userId ?? null;

  // Extract resource segments from path (e.g. /api/v1/encaissements/123 → resource=encaissements, resourceId=123)
  const parts = req.path.split('/').filter(Boolean);
  // Skip common path prefixes like 'api', 'v1'
  const apiPrefixes = new Set(['api', 'v1', 'v2']);
  const meaningful = parts.filter((p) => !apiPrefixes.has(p));
  const resource = meaningful[0] ?? 'unknown';
  const resourceId = (req.params as Record<string, string>).id ?? meaningful[1] ?? undefined;

  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
    req.ip ??
    'unknown';

  const action = `${req.method}:${req.originalUrl.split('?')[0]}`;

  res.on('finish', () => {
    prisma.auditLog
      .create({
        data: {
          user_id: userId,
          action,
          resource,
          resource_id: resourceId ?? null,
          ip_address: ip,
          user_agent: (req.headers['user-agent'] as string | undefined) ?? null,
          details: req.body && Object.keys(req.body).length > 0
            ? sanitizeBody(req.body as Record<string, unknown>)
            : undefined,
        },
      })
      .catch((err: unknown) => logger.error('Audit log write failed', { error: err }));
  });

  next();
}

function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const REDACTED_FIELDS = new Set([
    'password',
    'password_hash',
    'passwordHash',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'token',
    'refreshToken',
    'secret',
  ]);
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    sanitized[key] = REDACTED_FIELDS.has(key) ? '[REDACTED]' : value;
  }
  return sanitized;
}
