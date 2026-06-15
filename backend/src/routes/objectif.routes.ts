import { Router } from 'express';
import { listObjectifs, getObjectif, createObjectif, updateObjectif, deleteObjectif } from '../controllers/objectif.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createObjectifSchema, updateObjectifSchema } from '../schemas/objectif.schema';
import { UserRole } from '../types';

const router: Router = Router();
router.use(authenticate);

router.get('/', requireRole(UserRole.SUPER, UserRole.ADMIN, UserRole.COMMERCIAL), listObjectifs);
router.get('/:id', requireRole(UserRole.SUPER, UserRole.ADMIN, UserRole.COMMERCIAL), getObjectif);
router.post('/', requireRole(UserRole.SUPER, UserRole.ADMIN), validate(createObjectifSchema), createObjectif);
router.put('/:id', requireRole(UserRole.SUPER, UserRole.ADMIN), validate(updateObjectifSchema), updateObjectif);
router.delete('/:id', requireRole(UserRole.SUPER, UserRole.ADMIN), deleteObjectif);

export default router;
