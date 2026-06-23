import { Router } from 'express';
import {
  getPdvs, createPdv, getPdvById, updatePdv, deletePdv, getPdvStats,
} from '../controllers/pdv.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate, validateQuery } from '../middleware/validate';
import { createPdvSchema, updatePdvSchema, pdvQuerySchema } from '../schemas/pdv.schema';
import { UserRole } from '../types';

const router: Router = Router();
router.use(authenticate);

router.get('/', validateQuery(pdvQuerySchema), getPdvs);
router.post('/', requireRole(UserRole.SUPER, UserRole.ADMIN), validate(createPdvSchema), createPdv);
router.get('/:id', getPdvById);
router.put('/:id', requireRole(UserRole.SUPER, UserRole.ADMIN), validate(updatePdvSchema), updatePdv);
router.delete('/:id', requireRole(UserRole.SUPER), deletePdv);
router.get('/:id/stats', getPdvStats);

export default router;
