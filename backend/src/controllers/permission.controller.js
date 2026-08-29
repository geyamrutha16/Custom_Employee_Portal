import { asyncHandler } from '../utils/asyncHandler.js';
import { listPermissions } from '../models/permission.model.js';

export const getPermissions = asyncHandler(async (req, res) => {
  const permissions = await listPermissions();
  res.json({ permissions });
});
