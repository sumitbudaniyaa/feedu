import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Active branch — back-compat alias of `branchId` (every existing query uses this). */
      restaurantId?: string;
      /** Active branch (multi-branch). */
      branchId?: string;
      /** Tenant (brand) the request operates within. */
      brandId?: string;
      /** Branches the user may access (for branch-switch validation). */
      branchIds?: string[];
    }
  }
}

/**
 * Resolve the active brand + branch for the request.
 *
 * Multi-branch model: `brandId` is the tenant, `branchId` the active outlet.
 * `req.restaurantId` is kept as an alias of `branchId` so every existing
 * tenant-scoped query keeps working unchanged.
 *
 * - super_admin: targets any brand/branch via `x-brand-id` / `x-branch-id`
 *   (legacy `x-restaurant-id` still honoured).
 * - brand-wide roles: may switch branch via `x-branch-id` (must be in `branchIds`).
 * - branch roles: locked to their own branch from the token.
 */
export function resolveTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) return next(ApiError.unauthorized());

  if (req.auth.role === 'super_admin') {
    req.brandId = req.header('x-brand-id') ?? undefined;
    req.branchId = req.header('x-branch-id') ?? req.header('x-restaurant-id') ?? undefined;
    req.restaurantId = req.branchId;
    return next();
  }

  const branchIds = req.auth.branchIds ?? (req.auth.restaurantId ? [req.auth.restaurantId] : []);
  req.brandId = req.auth.brandId ?? undefined;
  req.branchIds = branchIds;

  // A brand-wide user may pick a branch via header; everyone else uses their own.
  const requested = req.header('x-branch-id') ?? req.header('x-restaurant-id');
  if (requested && (branchIds.includes(requested) || req.auth.restaurantId === requested)) {
    req.branchId = requested;
  } else {
    req.branchId = req.auth.restaurantId ?? branchIds[0];
  }

  if (!req.branchId && !req.brandId) {
    return next(ApiError.forbidden('No restaurant associated with this account'));
  }
  req.restaurantId = req.branchId; // back-compat alias
  next();
}

/** Guard for routes that must operate within a branch (tenant). */
export function requireTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.restaurantId) return next(ApiError.badRequest('Restaurant context required'));
  next();
}

/** Guard for brand-level routes (shared menu, loyalty, etc.). */
export function requireBrand(req: Request, _res: Response, next: NextFunction) {
  if (!req.brandId) return next(ApiError.badRequest('Brand context required'));
  next();
}
