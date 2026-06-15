import { Router } from 'express';
import {
  listUsers, createUser, getUser, updateUser, deactivateUser, resetUserPassword,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createUserSchema, updateUserSchema, resetPasswordSchema } from '../schemas/user.schema';
import { UserRole } from '../types';

const router: Router = Router();
router.use(authenticate);

router.get('/', requireRole(UserRole.SUPER, UserRole.ADMIN), listUsers);
router.post('/', requireRole(UserRole.SUPER), validate(createUserSchema), createUser);
router.get('/:id', requireRole(UserRole.SUPER, UserRole.ADMIN), getUser);
router.put('/:id', requireRole(UserRole.SUPER), validate(updateUserSchema), updateUser);
router.delete('/:id', requireRole(UserRole.SUPER), deactivateUser);
router.post('/:id/reset-password', requireRole(UserRole.SUPER), validate(resetPasswordSchema), resetUserPassword);

export default router;
