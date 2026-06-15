import { z } from 'zod';

export const createEncaissementSchema = z.object({
  pdvId: z.string().uuid(),
  type: z.enum(['REABONNEMENT', 'RECRUTEMENT']),
  subscriberId: z.string().uuid().optional(),
  formule: z.enum(['ACCESS', 'EVASION', 'EVASION_PLUS', 'TOUT_CANAL', 'PRESTIGE']),
  duree: z.number().int().positive(),
  montant: z.number().positive(),
  modePaiement: z.enum(['WAVE', 'ORANGE_MONEY', 'CASH', 'CHEQUE']),
  options: z.record(z.unknown()).optional(),
});

export const validateEncaissementSchema = z.object({
  statut: z.enum(['VALIDATED', 'REJECTED']),
  reason: z.string().optional(),
});

export const encaissementQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  pdvId: z.string().uuid().optional(),
  statut: z.enum(['PENDING', 'VALIDATED', 'REJECTED']).optional(),
  type: z.enum(['REABONNEMENT', 'RECRUTEMENT']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
