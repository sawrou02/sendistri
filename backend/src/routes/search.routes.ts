import { Router } from 'express';
import { globalSearch } from '../controllers/search.controller';
import { authenticate } from '../middleware/auth';

const router: Router = Router();
router.use(authenticate);
router.get('/', globalSearch);

export default router;
