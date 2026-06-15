import { Router } from 'express';
import {
  listCommissions, calculateCommissions, getCommission, validateCommission, markCommissionPaid,
} from '../controllers/commission.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '../types';

const router = Router();
router.use(authenticate);
router.use(requireRole(UserRole.SUPER, UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.COMMERCIAL));

router.get('/', listCommissions);
router.post('/calculate', requireRole(UserRole.SUPER, UserRole.ADMIN), calculateCommissions);
router.get('/:id', getCommission);
router.post('/:id/validate', requireRole(UserRole.SUPER, UserRole.ADMIN), validateCommission);
router.post('/:id/mark-paid', requireRole(UserRole.SUPER, UserRole.ADMIN), markCommissionPaid);

export default router;
