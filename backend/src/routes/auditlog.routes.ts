import { Router } from 'express';
import { listAuditLogs } from '../controllers/auditlog.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '../types';

const router: Router = Router();
router.use(authenticate);

router.get('/', requireRole(UserRole.SUPER, UserRole.ADMIN), listAuditLogs);

export default router;
