import { z } from 'zod';

export const createDecoderSchema = z.object({
  serial: z.string().min(4).max(50),
  type: z.string().min(1).max(50),
  model: z.string().max(50).optional(),
});

export const assignDecoderSchema = z.object({
  pdvId: z.string().uuid(),
});

export const updateDecoderSchema = z.object({
  statut: z.enum(['STOCK', 'DEPLOYED', 'IMMOBILIZED', 'LOST']).optional(),
  notes: z.string().max(500).optional(),
});

export const decoderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  statut: z.enum(['STOCK', 'DEPLOYED', 'IMMOBILIZED', 'LOST']).optional(),
  pdvId: z.string().uuid().optional(),
  type: z.string().optional(),
});
