import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { getAuditLogs } from '../controllers/auditLog.controller.js';

const router = Router();

router.get('/', authenticate, authorize('AUDIT_VIEW'), getAuditLogs);

export default router;
