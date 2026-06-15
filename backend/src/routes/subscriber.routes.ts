import { Router } from 'express';
import {
  listSubscribers, createSubscriber, getSubscriber, updateSubscriber, getSubscriberHistory,
} from '../controllers/subscriber.controller';
import { authenticate } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import { createSubscriberSchema, updateSubscriberSchema, subscriberQuerySchema } from '../schemas/subscriber.schema';

const router = Router();
router.use(authenticate);

router.get('/', validateQuery(subscriberQuerySchema), listSubscribers);
router.post('/', validate(createSubscriberSchema), createSubscriber);
router.get('/:id', getSubscriber);
router.put('/:id', validate(updateSubscriberSchema), updateSubscriber);
router.get('/:id/subscriptions', getSubscriberHistory);

export default router;
