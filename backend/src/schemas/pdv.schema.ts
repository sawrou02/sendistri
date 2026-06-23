import { z } from 'zod';

export const createPdvSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(100),
  type: z.enum(['PDV', 'PARTNER']),
  secteur: z.string().min(1),
  region: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  caution: z.number().nonnegative(),
});

export const updatePdvSchema = createPdvSchema.partial().extend({
  statut: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

export const pdvQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  statut: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  region: z.string().optional(),
  type: z.enum(['PDV', 'PARTNER']).optional(),
});
