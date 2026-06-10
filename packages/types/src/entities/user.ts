import { z } from 'zod';
import { objectIdSchema } from '../common.js';
import { userRoleSchema } from '../enums.js';

export const userSchema = z.object({
  _id: objectIdSchema,
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: userRoleSchema,
  /** Restaurant this user belongs to (staff/owner). Null for super_admin & global customers. */
  restaurantId: objectIdSchema.nullable().optional(),
  avatar: z.string().url().optional(),
  permissions: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  lastLoginAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type User = z.infer<typeof userSchema>;

/** Shape returned to clients (never includes password hash / tokens). */
export const publicUserSchema = userSchema.omit({});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const createStaffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(['manager', 'kitchen', 'waiter']),
  password: z.string().min(8),
  permissions: z.array(z.string()).optional(),
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
