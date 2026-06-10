import type { NextFunction, Request, Response } from 'express';
import type { JwtPayload, UserRoleType } from '@feedo/types';
import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/jwt.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

/** Require a valid access token; attaches `req.auth`. */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing bearer token'));
  }
  try {
    req.auth = verifyAccessToken(header.slice(7));
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

/** Restrict a route to specific roles. Use after `authenticate`. */
export function authorize(...roles: UserRoleType[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(ApiError.unauthorized());
    if (!roles.includes(req.auth.role as UserRoleType)) {
      return next(ApiError.forbidden('Insufficient role'));
    }
    next();
  };
}
