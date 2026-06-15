import { z } from 'zod';

export const createObjectifSchema = z.object({
  pdvId: z.string().uuid().optional().nullable(),
  periode: z.string().regex(/^\d{4}-\d{2}$/, 'Periode must be YYYY-MM'),
  recrutement_cible: z.number().int().min(0),
  reabonnement_cible: z.number().int().min(0),
  ca_cible: z.number().min(0),
});

export const updateObjectifSchema = createObjectifSchema.partial().omit({ pdvId: true, periode: true });
