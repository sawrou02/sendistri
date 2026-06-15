import { Router } from 'express';
import { getKpis, getCharts } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/kpis', getKpis);
router.get('/charts', getCharts);

export default router;
