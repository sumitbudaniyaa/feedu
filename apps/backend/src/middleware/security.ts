import rateLimit from 'express-rate-limit';

/** Global limiter — generous, protects against abuse/scraping. */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
});

/** Strict limiter for auth endpoints — mitigates credential stuffing/brute force. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many attempts, please try again later' },
  },
});

/** Limiter for public order placement — prevents spam orders from a single IP. */
export const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Slow down a moment' } },
});

/** Strict limiter for OTP requests — prevents SMS bombing / brute force. */
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 6,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many code requests — try again later' },
  },
});
