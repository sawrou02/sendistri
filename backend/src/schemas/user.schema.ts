import { z } from 'zod';
import { UserRole } from '../types';

const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[a-z]/, 'Must contain lowercase')
  .regex(/[0-9]/, 'Must contain number');

export const createUserSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  role: z.nativeEnum(UserRole),
  pdvId: z.string().uuid().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole).optional(),
  pdvId: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});
