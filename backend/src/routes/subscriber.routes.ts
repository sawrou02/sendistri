import { Router } from 'express';
import {
  getSubscribers, createSubscriber, getSubscriberById, updateSubscriber, getSubscriberSubscriptions,
} from '../controllers/subscriber.controller';
import { authenticate } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import { createSubscriberSchema, updateSubscriberSchema, subscriberQuerySchema } from '../schemas/subscriber.schema';

const router: Router = Router();
router.use(authenticate);

router.get('/', validateQuery(subscriberQuerySchema), getSubscribers);
router.post('/', validate(createSubscriberSchema), createSubscriber);
router.get('/:id', getSubscriberById);
router.put('/:id', validate(updateSubscriberSchema), updateSubscriber);
router.get('/:id/subscriptions', getSubscriberSubscriptions);

export default router;
