import { Router } from 'express';
import { login, refresh, logout, me, changePassword, verifyTwoFa, setup2fa, enable2fa, disable2fa } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiter';
import { loginSchema, changePasswordSchema } from '../schemas/auth.schema';

const router: Router = Router();

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/2fa/verify', authLimiter, verifyTwoFa);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.post('/2fa/setup', authenticate, setup2fa);
router.post('/2fa/enable', authenticate, enable2fa);
router.post('/2fa/disable', authenticate, disable2fa);

export default router;
