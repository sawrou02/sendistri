import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../types';

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'],
    issuer: 'sendistri-api',
    audience: 'sendistri-client',
  });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as jwt.SignOptions['expiresIn'],
    issuer: 'sendistri-api',
    audience: 'sendistri-client',
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: 'sendistri-api',
    audience: 'sendistri-client',
  });

  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }

  return {
    userId: decoded['userId'] as string,
    role: decoded['role'] as JwtPayload['role'],
    pdvId: decoded['pdvId'] as string | undefined,
  };
}

export function verifyRefreshToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: 'sendistri-api',
    audience: 'sendistri-client',
  });

  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }

  return {
    userId: decoded['userId'] as string,
    role: decoded['role'] as JwtPayload['role'],
    pdvId: decoded['pdvId'] as string | undefined,
  };
}
