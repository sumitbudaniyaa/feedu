import type { NextFunction, Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

/**
 * Reject malformed Mongo ids before they reach the DB layer.
 * Prevents CastError noise and is a small hardening measure against
 * injection via route params.
 */
export function validateObjectId(param = 'id') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const value = req.params[param];
    if (!value || !isValidObjectId(value)) {
      return next(ApiError.badRequest(`Invalid ${param}`));
    }
    next();
  };
}
