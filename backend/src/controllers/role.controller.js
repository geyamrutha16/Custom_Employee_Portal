import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/errorHandler.js';
import { writeAuditLog } from '../services/auditLog.service.js';
import {
  listRoles,
  findRoleById,
  findRoleByName,
  createRole,
  updateRoleDescription,
  deleteRole,
  setRolePermissions,
  isRoleAssignedToAnyUser,
} from '../models/role.model.js';

export const getRoles = asyncHandler(async (req, res) => {
  const roles = await listRoles();
  res.json({ roles });
});

export const getRole = asyncHandler(async (req, res) => {
  const role = await findRoleById(Number(req.params.id));
  if (!role) throw new ApiError(404, 'Role not found');
  res.json({ role });
});

export const postRole = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const existing = await findRoleByName(name);
  if (existing) throw new ApiError(409, 'A role with this name already exists');

  const roleId = await createRole({ name, description });

  await writeAuditLog({
    userId: req.user.id,
    action: 'ROLE_CREATE',
    resource: 'role',
    resourceId: String(roleId),
    metadata: { name },
    req,
  });

  const role = await findRoleById(roleId);
  res.status(201).json({ role });
});

export const putRole = asyncHandler(async (req, res) => {
  const roleId = Number(req.params.id);
  const role = await findRoleById(roleId);
  if (!role) throw new ApiError(404, 'Role not found');

  await updateRoleDescription(roleId, req.body.description ?? role.description);

  await writeAuditLog({
    userId: req.user.id,
    action: 'ROLE_UPDATE',
    resource: 'role',
    resourceId: String(roleId),
    metadata: req.body,
    req,
  });

  const updated = await findRoleById(roleId);
  res.json({ role: updated });
});

export const removeRole = asyncHandler(async (req, res) => {
  const roleId = Number(req.params.id);
  const role = await findRoleById(roleId);
  if (!role) throw new ApiError(404, 'Role not found');

  if (role.name === 'ADMIN') {
    throw new ApiError(409, 'The ADMIN role cannot be deleted');
  }

  const inUse = await isRoleAssignedToAnyUser(roleId);
  if (inUse) {
    throw new ApiError(409, 'Cannot delete a role that is currently assigned to one or more users');
  }

  await deleteRole(roleId);

  await writeAuditLog({
    userId: req.user.id,
    action: 'ROLE_DELETE',
    resource: 'role',
    resourceId: String(roleId),
    metadata: { name: role.name },
    req,
  });

  res.json({ success: true });
});

export const putRolePermissions = asyncHandler(async (req, res) => {
  const roleId = Number(req.params.id);
  const role = await findRoleById(roleId);
  if (!role) throw new ApiError(404, 'Role not found');

  await setRolePermissions(roleId, req.body.permissionIds);

  await writeAuditLog({
    userId: req.user.id,
    action: 'PERMISSION_CHANGE',
    resource: 'role',
    resourceId: String(roleId),
    metadata: { permissionIds: req.body.permissionIds },
    req,
  });

  const roles = await listRoles();
  const updated = roles.find((r) => r.id === roleId);
  res.json({ role: updated });
});
