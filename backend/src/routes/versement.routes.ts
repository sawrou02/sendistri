import { Router } from 'express';
import {
  listVersements, createVersement, getVersement, confirmVersement,
} from '../controllers/versement.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate, validateQuery } from '../middleware/validate';
import {
  createVersementSchema, confirmVersementSchema, versementQuerySchema,
} from '../schemas/versement.schema';
import { UserRole } from '../types';

const router = Router();
router.use(authenticate);

router.get('/', validateQuery(versementQuerySchema), listVersements);
router.post('/', validate(createVersementSchema), createVersement);
router.get('/:id', getVersement);
router.post(
  '/:id/confirm',
  requireRole(UserRole.SUPER, UserRole.ADMIN, UserRole.ACCOUNTANT),
  validate(confirmVersementSchema),
  confirmVersement,
);

export default router;
