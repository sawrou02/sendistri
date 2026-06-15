import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import pdvRoutes from './pdv.routes';
import subscriberRoutes from './subscriber.routes';
import encaissementRoutes from './encaissement.routes';
import versementRoutes from './versement.routes';
import decoderRoutes from './decoder.routes';
import dashboardRoutes from './dashboard.routes';
import commissionRoutes from './commission.routes';
import objectifRoutes from './objectif.routes';
import auditlogRoutes from './auditlog.routes';

const router: Router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/pdvs', pdvRoutes);
router.use('/subscribers', subscriberRoutes);
router.use('/encaissements', encaissementRoutes);
router.use('/versements', versementRoutes);
router.use('/decoders', decoderRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/commissions', commissionRoutes);
router.use('/objectifs', objectifRoutes);
router.use('/audit-logs', auditlogRoutes);

export default router;
