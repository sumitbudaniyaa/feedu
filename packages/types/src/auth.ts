import { z } from 'zod';
import { publicUserSchema } from './entities/user.js';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Owner self-signup → creates user + restaurant shell + starts onboarding. */
export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  restaurantName: z.string().min(2),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession {
  user: z.infer<typeof publicUserSchema>;
  tokens: AuthTokens;
}

/** Decoded JWT access-token payload. */
export interface JwtPayload {
  sub: string; // userId
  role: string;
  /** Active branch (kept for backward compatibility — equals the active `branchId`). */
  restaurantId: string | null;
  /** Tenant the user belongs to (multi-branch). */
  brandId?: string | null;
  /** Branches the user may access (brand-wide roles get all the brand's branches). */
  branchIds?: string[];
}
