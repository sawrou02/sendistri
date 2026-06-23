import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // SSE connections pass the token as a query param since EventSource doesn't support headers
  const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ') && !queryToken) {
    res.status(401).json({ success: false, message: 'Missing or invalid Authorization header' });
    return;
  }

  const token = queryToken ?? authHeader!.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      role: payload.role,
      pdvId: payload.pdvId,
    };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}
