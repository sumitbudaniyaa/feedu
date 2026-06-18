import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Zod validation (e.g. from the crud create/update schema parse) → 400, not 500.
  if (err instanceof ZodError) {
    const fields = err.flatten().fieldErrors;
    const first = Object.entries(fields).find(([, v]) => v && v.length);
    const message = first ? `${first[0]}: ${first[1]![0]}` : 'Validation failed';
    return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message, details: fields } });
  }

  // Mongoose duplicate key
  if (typeof err === 'object' && err && 'code' in err && (err as { code: number }).code === 11000) {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'Resource already exists' },
    });
  }

  const name = (err as { name?: string })?.name;
  // Mongoose cast / validation
  if (name === 'CastError') {
    return res
      .status(400)
      .json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid identifier' } });
  }
  if (name === 'ValidationError') {
    return res
      .status(400)
      .json({ success: false, error: { code: 'BAD_REQUEST', message: 'Validation failed' } });
  }
  // JWT
  if (name === 'JsonWebTokenError' || name === 'TokenExpiredError') {
    return res
      .status(401)
      .json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }

  logger.error('Unhandled error', err);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL', message: 'Internal server error' },
  });
}
