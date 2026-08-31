import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { getServices, getCrm, getDesk } from '../controllers/zoho.controller.js';
import { authorizeRedirect, oauthCallback } from '../controllers/zohoOAuth.controller.js';

const router = Router();

const APP_PERMISSIONS = { crm: 'ZOHO_CRM_VIEW', desk: 'ZOHO_DESK_VIEW' };

function requireKnownApp(req, res, next) {
  if (!APP_PERMISSIONS[req.params.app]) {
    return res.status(404).json({ error: 'Unknown Zoho app' });
  }
  next();
}

// Public: Zoho redirects the employee's browser here directly after they click
// "Allow" — it can't carry our auth cookie reliably, so identity/CSRF protection
// comes from the single-use state token instead (see zohoOAuth.controller.js).
router.get('/oauth/callback', oauthCallback);

router.use(authenticate);

router.get('/services', getServices);
router.get('/crm', authorize('ZOHO_CRM_VIEW'), getCrm);
router.get('/desk', authorize('ZOHO_DESK_VIEW'), getDesk);

router.get(
  '/oauth/:app/authorize',
  requireKnownApp,
  (req, res, next) => authorize(APP_PERMISSIONS[req.params.app])(req, res, next),
  authorizeRedirect
);

export default router;
