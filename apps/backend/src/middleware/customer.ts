import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { verifyCustomerToken } from '../utils/jwt.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      customerPhone?: string;
      customerName?: string;
    }
  }
}

/** Read the customer token if present (no error if missing) → sets req.customerPhone. */
export function optionalCustomerAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = verifyCustomerToken(header.slice(7));
      if (payload.kind === 'customer') {
        req.customerPhone = payload.sub;
        req.customerName = payload.name;
      }
    } catch {
      // Ignore invalid tokens for optional auth.
    }
  }
  next();
}

/** Require a valid customer token. */
export function requireCustomer(req: Request, _res: Response, next: NextFunction) {
  if (!req.customerPhone) return next(ApiError.unauthorized('Please sign in to continue'));
  next();
}
