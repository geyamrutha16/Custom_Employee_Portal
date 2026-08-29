import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { getPermissions } from '../controllers/permission.controller.js';

const router = Router();

router.get('/', authenticate, authorize('PERMISSION_VIEW'), getPermissions);

export default router;
