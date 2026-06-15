import { Router } from 'express';
import {
  listPdvs, createPdv, getPdv, updatePdv, deactivatePdv, getPdvStats,
} from '../controllers/pdv.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate, validateQuery } from '../middleware/validate';
import { createPdvSchema, updatePdvSchema, pdvQuerySchema } from '../schemas/pdv.schema';
import { UserRole } from '../types';

const router = Router();
router.use(authenticate);

router.get('/', validateQuery(pdvQuerySchema), listPdvs);
router.post('/', requireRole(UserRole.SUPER, UserRole.ADMIN), validate(createPdvSchema), createPdv);
router.get('/:id', getPdv);
router.put('/:id', requireRole(UserRole.SUPER, UserRole.ADMIN), validate(updatePdvSchema), updatePdv);
router.delete('/:id', requireRole(UserRole.SUPER), deactivatePdv);
router.get('/:id/stats', getPdvStats);

export default router;
