import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { getDepartments } from '../controllers/department.controller.js';

const router = Router();

router.get('/', authenticate, authorize('USER_VIEW'), getDepartments);

export default router;
