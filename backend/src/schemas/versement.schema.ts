import { z } from 'zod';

export const createVersementSchema = z.object({
  pdvId: z.string().uuid(),
  montant: z.number().positive(),
  banque: z.string().min(1).max(100),
  bordereau: z.string().min(1).max(100),
});

export const confirmVersementSchema = z.object({
  statut: z.enum(['CONFIRMED', 'REJECTED']),
  reason: z.string().optional(),
});

export const versementQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  pdvId: z.string().uuid().optional(),
  statut: z.enum(['PENDING', 'CONFIRMED', 'REJECTED']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
