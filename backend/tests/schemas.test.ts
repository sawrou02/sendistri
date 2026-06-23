import { describe, it, expect } from 'vitest';
import { loginSchema, changePasswordSchema } from '../src/schemas/auth.schema';
import { createPdvSchema } from '../src/schemas/pdv.schema';
import { createEncaissementSchema } from '../src/schemas/encaissement.schema';

describe('auth schemas', () => {
  it('accepts a valid login', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  });

  it('enforces password complexity on change-password', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'x', newPassword: 'short' }).success).toBe(false);
    expect(
      changePasswordSchema.safeParse({ currentPassword: 'x', newPassword: 'Strong123' }).success
    ).toBe(true);
  });
});

describe('pdv schema', () => {
  it('rejects a negative caution', () => {
    const result = createPdvSchema.safeParse({
      code: 'P1', name: 'Test', type: 'PDV', secteur: 'C', region: 'Dakar', caution: -5,
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid PDV', () => {
    const result = createPdvSchema.safeParse({
      code: 'P1', name: 'Test', type: 'PDV', secteur: 'C', region: 'Dakar', caution: 100000,
    });
    expect(result.success).toBe(true);
  });
});

describe('encaissement schema', () => {
  it('rejects a non-positive montant', () => {
    const result = createEncaissementSchema.safeParse({
      pdvId: '00000000-0000-0000-0000-000000000000',
      type: 'RECRUTEMENT', formule: 'ACCESS', duree: 1, montant: 0, modePaiement: 'CASH',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid encaissement', () => {
    const result = createEncaissementSchema.safeParse({
      pdvId: '00000000-0000-0000-0000-000000000000',
      type: 'RECRUTEMENT', formule: 'ACCESS', duree: 12, montant: 25000, modePaiement: 'WAVE',
    });
    expect(result.success).toBe(true);
  });
});
