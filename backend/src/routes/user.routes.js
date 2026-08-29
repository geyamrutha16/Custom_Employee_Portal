import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createUserSchema, updateUserSchema, assignRolesSchema } from '../validators/user.validator.js';
import { getUsers, getUser, postUser, putUser, deleteUser, putUserRoles } from '../controllers/user.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('USER_VIEW'), getUsers);
router.post('/', authorize('USER_CREATE'), validate(createUserSchema), postUser);
router.get('/:id', authorize('USER_VIEW'), getUser);
router.put('/:id', authorize('USER_UPDATE'), validate(updateUserSchema), putUser);
router.delete('/:id', authorize('USER_DELETE'), deleteUser);
router.put('/:id/roles', authorize('USER_UPDATE'), validate(assignRolesSchema), putUserRoles);

export default router;
