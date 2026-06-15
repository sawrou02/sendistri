import { Router } from 'express';
import {
  listEncaissements, createEncaissement, getEncaissement, validateEncaissement,
} from '../controllers/encaissement.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate, validateQuery } from '../middleware/validate';
import {
  createEncaissementSchema, validateEncaissementSchema, encaissementQuerySchema,
} from '../schemas/encaissement.schema';
import { UserRole } from '../types';

const router = Router();
router.use(authenticate);

router.get('/', validateQuery(encaissementQuerySchema), listEncaissements);
router.post('/', validate(createEncaissementSchema), createEncaissement);
router.get('/:id', getEncaissement);
router.post(
  '/:id/validate',
  requireRole(UserRole.SUPER, UserRole.ADMIN, UserRole.ACCOUNTANT),
  validate(validateEncaissementSchema),
  validateEncaissement,
);

export default router;
