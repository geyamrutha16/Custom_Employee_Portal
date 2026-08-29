import bcrypt from 'bcryptjs';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/errorHandler.js';
import { writeAuditLog } from '../services/auditLog.service.js';
import { pool } from '../db/pool.js';
import {
  listUsers,
  createUser,
  updateUser,
  findUserById,
  setUserRoles,
  userHasRole,
  countActiveAdmins,
  getAuthContextForUser,
  findUserByEmail,
} from '../models/user.model.js';

export const getUsers = asyncHandler(async (req, res) => {
  const users = await listUsers();
  res.json({ users });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await getAuthContextForUser(Number(req.params.id));
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ user });
});

export const postUser = asyncHandler(async (req, res) => {
  const { name, email, password, departmentId, roleIds } = req.body;

  const existing = await findUserByEmail(email);
  if (existing) throw new ApiError(409, 'A user with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = await createUser({ name, email, passwordHash, departmentId });
  if (roleIds.length > 0) {
    await setUserRoles(userId, roleIds);
  }

  await writeAuditLog({
    userId: req.user.id,
    action: 'USER_CREATE',
    resource: 'user',
    resourceId: String(userId),
    metadata: { email },
    req,
  });

  const user = await getAuthContextForUser(userId);
  res.status(201).json({ user });
});

export const putUser = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  const target = await findUserById(targetId);
  if (!target) throw new ApiError(404, 'User not found');

  const { status } = req.body;
  if (status === 'INACTIVE' && target.status === 'ACTIVE') {
    await guardLastAdminDeactivation(targetId);
  }

  await updateUser(targetId, req.body);

  await writeAuditLog({
    userId: req.user.id,
    action: 'USER_UPDATE',
    resource: 'user',
    resourceId: String(targetId),
    metadata: req.body,
    req,
  });

  const user = await getAuthContextForUser(targetId);
  res.json({ user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  const target = await findUserById(targetId);
  if (!target) throw new ApiError(404, 'User not found');

  await guardLastAdminDeactivation(targetId);

  await updateUser(targetId, { status: 'INACTIVE' });

  await writeAuditLog({
    userId: req.user.id,
    action: 'USER_DELETE',
    resource: 'user',
    resourceId: String(targetId),
    req,
  });

  res.json({ success: true });
});

export const putUserRoles = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  const target = await findUserById(targetId);
  if (!target) throw new ApiError(404, 'User not found');

  const { roleIds } = req.body;
  const wasAdmin = await userHasRole(targetId, 'ADMIN');
  const willBeAdmin = await roleIdsIncludeAdmin(roleIds);

  if (wasAdmin && !willBeAdmin) {
    const activeAdmins = await countActiveAdmins();
    if (activeAdmins <= 1) {
      throw new ApiError(409, 'Cannot remove the ADMIN role from the last active administrator');
    }
  }

  await setUserRoles(targetId, roleIds);

  await writeAuditLog({
    userId: req.user.id,
    action: 'ROLE_ASSIGNMENT',
    resource: 'user',
    resourceId: String(targetId),
    metadata: { roleIds },
    req,
  });

  const user = await getAuthContextForUser(targetId);
  res.json({ user });
});

async function guardLastAdminDeactivation(targetId) {
  const targetIsAdmin = await userHasRole(targetId, 'ADMIN');
  if (!targetIsAdmin) return;
  const activeAdmins = await countActiveAdmins();
  if (activeAdmins <= 1) {
    throw new ApiError(409, 'Cannot deactivate the last active administrator');
  }
}

async function roleIdsIncludeAdmin(roleIds) {
  if (roleIds.length === 0) return false;
  const [rows] = await pool.query(
    `SELECT 1 FROM roles WHERE id IN (${roleIds.map(() => '?').join(',')}) AND name = 'ADMIN' LIMIT 1`,
    roleIds
  );
  return rows.length > 0;
}
