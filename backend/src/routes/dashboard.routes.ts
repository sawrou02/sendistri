import { Router } from 'express';
import { getKpis, getCharts, getMonthlyReport } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '../types';

const router: Router = Router();
router.use(authenticate);

router.get('/kpis', getKpis);
router.get('/charts', getCharts);
router.get('/rapport', requireRole(UserRole.SUPER, UserRole.ADMIN, UserRole.ACCOUNTANT), getMonthlyReport);

export default router;
