import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .max(50)
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Role name must be uppercase letters, numbers, and underscores'),
  description: z.string().max(255).optional(),
});

export const updateRoleSchema = z.object({
  description: z.string().max(255).optional(),
});

export const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.number().int().positive()),
});
