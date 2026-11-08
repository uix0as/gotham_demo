import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as controller from '../controllers/members.js';
const router = Router();
router.patch('/me', requireAuth, controller.updateMe);
router.delete('/me', requireAuth, controller.deleteMe);
export default router;
