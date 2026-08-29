import { ApiError } from './errorHandler.js';
import { writeAuditLog } from '../services/auditLog.service.js';

export const authorize = (permission) => async (req, res, next) => {
  if (req.user?.permissions?.includes(permission)) {
    return next();
  }

  await writeAuditLog({
    userId: req.user?.id ?? null,
    action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
    resource: req.originalUrl,
    metadata: { requiredPermission: permission, method: req.method },
    req,
  });

  next(new ApiError(403, 'You do not have permission to perform this action'));
};
