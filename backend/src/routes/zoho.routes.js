import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { getServices, getCrm, getDesk } from '../controllers/zoho.controller.js';

const router = Router();

router.use(authenticate);

router.get('/services', getServices);
router.get('/crm', authorize('ZOHO_CRM_VIEW'), getCrm);
router.get('/desk', authorize('ZOHO_DESK_VIEW'), getDesk);

export default router;
