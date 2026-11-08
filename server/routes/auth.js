import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as controller from '../controllers/auth.js';
const router = Router();
router.post('/signup', controller.signup);
router.post('/login', controller.login);
router.post('/logout', controller.logout);
router.get('/me', requireAuth, controller.me);
export default router;
