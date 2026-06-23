import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword, generateSecureToken, hashToken } from '../src/utils/password';

describe('password utils', () => {
  it('hashes a password to a non-plaintext value', async () => {
    const hash = await hashPassword('Admin@1234!');
    expect(hash).not.toBe('Admin@1234!');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('verifies a correct password', async () => {
    const hash = await hashPassword('Admin@1234!');
    expect(await comparePassword('Admin@1234!', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('Admin@1234!');
    expect(await comparePassword('wrong', hash)).toBe(false);
  });

  it('produces different hashes for the same password (salted)', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
  });
});

describe('token utils', () => {
  it('generates a random hex token of expected length', () => {
    const token = generateSecureToken(32);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces unique tokens', () => {
    expect(generateSecureToken()).not.toBe(generateSecureToken());
  });

  it('hashes a token deterministically (sha256)', () => {
    const token = 'abc';
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });
});
