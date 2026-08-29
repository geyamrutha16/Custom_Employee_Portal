import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createRoleSchema, updateRoleSchema, assignPermissionsSchema } from '../validators/role.validator.js';
import { getRoles, getRole, postRole, putRole, removeRole, putRolePermissions } from '../controllers/role.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ROLE_VIEW'), getRoles);
router.post('/', authorize('ROLE_CREATE'), validate(createRoleSchema), postRole);
router.get('/:id', authorize('ROLE_VIEW'), getRole);
router.put('/:id', authorize('ROLE_UPDATE'), validate(updateRoleSchema), putRole);
router.delete('/:id', authorize('ROLE_DELETE'), removeRole);
router.put('/:id/permissions', authorize('ROLE_UPDATE'), validate(assignPermissionsSchema), putRolePermissions);

export default router;
