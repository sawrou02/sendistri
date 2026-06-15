import { describe, it, expect, vi } from 'vitest';
import type { Response } from 'express';
import { requireRole } from '../src/middleware/rbac';
import { AuthenticatedRequest, UserRole } from '../src/types';

function mockRes() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('requireRole middleware', () => {
  it('calls next() when the role is allowed', () => {
    const req = { user: { userId: 'u', role: UserRole.ADMIN } } as AuthenticatedRequest;
    const res = mockRes();
    const next = vi.fn();
    requireRole(UserRole.SUPER, UserRole.ADMIN)(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when the role is not allowed', () => {
    const req = { user: { userId: 'u', role: UserRole.PDV_OPERATOR } } as AuthenticatedRequest;
    const res = mockRes();
    const next = vi.fn();
    requireRole(UserRole.SUPER, UserRole.ADMIN)(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 401 when unauthenticated', () => {
    const req = {} as AuthenticatedRequest;
    const res = mockRes();
    const next = vi.fn();
    requireRole(UserRole.ADMIN)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
