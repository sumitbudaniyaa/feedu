import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      restaurantId?: string;
    }
  }
}

/**
 * Resolve the active restaurant (tenant) for the request.
 * Super-admins may target any restaurant via the `x-restaurant-id` header;
 * everyone else is locked to their own `restaurantId` from the token.
 */
export function resolveTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) return next(ApiError.unauthorized());

  if (req.auth.role === 'super_admin') {
    const headerId = req.header('x-restaurant-id');
    req.restaurantId = headerId ?? undefined;
    return next();
  }

  if (!req.auth.restaurantId) {
    return next(ApiError.forbidden('No restaurant associated with this account'));
  }
  req.restaurantId = req.auth.restaurantId;
  next();
}

/** Guard for routes that must operate within a tenant. */
export function requireTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.restaurantId) return next(ApiError.badRequest('Restaurant context required'));
  next();
}
