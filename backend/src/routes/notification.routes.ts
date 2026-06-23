import { Router } from 'express';
import { streamNotifications } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '../types';

const router: Router = Router();
router.use(authenticate);
router.get('/stream', requireRole(UserRole.SUPER, UserRole.ADMIN, UserRole.ACCOUNTANT), streamNotifications);

export default router;
