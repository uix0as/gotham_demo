import { Router } from 'express';
import * as controller from '../controllers/analysis.js';
const router = Router();
router.get('/', controller.list);
router.get('/:id', controller.get);
export default router;
