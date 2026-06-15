import { describe, it, expect } from 'vitest';
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from '../src/utils/jwt';
import { UserRole } from '../src/types';

const payload = { userId: 'u-1', role: UserRole.ADMIN, pdvId: 'pdv-1' };

describe('jwt utils', () => {
  it('signs and verifies an access token round-trip', () => {
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe('u-1');
    expect(decoded.role).toBe(UserRole.ADMIN);
    expect(decoded.pdvId).toBe('pdv-1');
  });

  it('signs and verifies a refresh token round-trip', () => {
    const token = signRefreshToken(payload);
    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe('u-1');
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken(payload);
    expect(() => verifyAccessToken(token + 'x')).toThrow();
  });

  it('does not accept an access token as a refresh token (separate secrets)', () => {
    const access = signAccessToken(payload);
    expect(() => verifyRefreshToken(access)).toThrow();
  });
});
