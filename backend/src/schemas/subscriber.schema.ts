import { z } from 'zod';

export const createSubscriberSchema = z.object({
  code: z.string().min(2).max(30),
  nom: z.string().min(1).max(100),
  prenom: z.string().min(1).max(100),
  phone: z.string().min(8).max(20),
  pdvId: z.string().uuid(),
  formule: z.enum(['ACCESS', 'EVASION', 'EVASION_PLUS', 'TOUT_CANAL', 'PRESTIGE']),
  date_abo: z.coerce.date(),
});

export const updateSubscriberSchema = createSubscriberSchema.partial().omit({ pdvId: true });

export const subscriberQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  statut: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ECHU']).optional(),
  formule: z.enum(['ACCESS', 'EVASION', 'EVASION_PLUS', 'TOUT_CANAL', 'PRESTIGE']).optional(),
  pdvId: z.string().uuid().optional(),
});
