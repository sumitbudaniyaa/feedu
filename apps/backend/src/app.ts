import compression from 'compression';
import cors from 'cors';
import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';
import { authLimiter, globalLimiter, orderLimiter } from './middleware/security.js';
import { UPLOADS_DIR } from './modules/uploads/uploads.routes.js';
import apiRoutes from './routes/index.js';

export function createApp() {
  const app = express();

  // Trust the first proxy hop so rate-limit / IPs work behind a load balancer.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Secure headers. API is JSON-only, so a tight CSP is safe.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Strip keys containing `$`/`.` to block NoSQL-injection operators.
  app.use(mongoSanitize());
  // Guard against HTTP parameter pollution.
  app.use(hpp());

  app.use(compression());
  if (!env.isProd) app.use(morgan('dev'));

  // Serve uploaded images. CORP cross-origin so the frontends (other ports) can load them.
  app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
      maxAge: '7d',
      setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
    }),
  );

  // Rate limiting (targeted limiters first, then a global ceiling).
  app.use('/api/auth', authLimiter);
  app.use('/api/public/r', orderLimiter); // public order placement lives under /public/r/:slug/orders
  app.use('/api', globalLimiter);

  app.use('/api', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
