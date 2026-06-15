import { Router } from 'express';
import {
  listDecoders, createDecoder, getDecoder, assignDecoder, returnDecoder, updateDecoder,
} from '../controllers/decoder.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate, validateQuery } from '../middleware/validate';
import {
  createDecoderSchema, assignDecoderSchema, updateDecoderSchema, decoderQuerySchema,
} from '../schemas/decoder.schema';
import { UserRole } from '../types';

const router: Router = Router();
router.use(authenticate);

router.get('/', validateQuery(decoderQuerySchema), listDecoders);
router.post(
  '/',
  requireRole(UserRole.SUPER, UserRole.LOGISTICS),
  validate(createDecoderSchema),
  createDecoder,
);
router.get('/:id', getDecoder);
router.post(
  '/:id/assign',
  requireRole(UserRole.SUPER, UserRole.LOGISTICS),
  validate(assignDecoderSchema),
  assignDecoder,
);
router.post('/:id/return', requireRole(UserRole.SUPER, UserRole.LOGISTICS), returnDecoder);
router.put('/:id', requireRole(UserRole.SUPER, UserRole.LOGISTICS), validate(updateDecoderSchema), updateDecoder);

export default router;
