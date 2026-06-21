import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

// Load root .env (monorepo shares a single env file).
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config(); // fall back to local .env if present

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/feedo'),
  JWT_ACCESS_SECRET: z.string().min(8).default('dev-access-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().min(8).default('dev-refresh-secret-change-me'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176'),
  REDIS_URL: z.string().optional(),
  // Razorpay (optional in dev — when unset, payments run in a demo/mock mode).
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  // Shared secret for aggregator (Zomato/Swiggy/middleware) order ingestion webhooks.
  INTEGRATION_SECRET: z.string().optional(),
  // Cloudinary image hosting (optional — falls back to local /uploads when unset).
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  // Beta/demo hosting: skip real SMS — OTP is the fixed code 123456, shown to the diner.
  BETA_MODE: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((s) => s.trim()),
  isProd: parsed.data.NODE_ENV === 'production',
  betaMode: parsed.data.BETA_MODE === 'true',
  // When true, OTP is fixed to 123456 and returned to the client (no SMS provider needed):
  // any non-prod run, or an explicit beta deployment.
  demoOtp: parsed.data.NODE_ENV !== 'production' || parsed.data.BETA_MODE === 'true',
  razorpayConfigured: Boolean(parsed.data.RAZORPAY_KEY_ID && parsed.data.RAZORPAY_KEY_SECRET),
  cloudinaryConfigured: Boolean(
    parsed.data.CLOUDINARY_CLOUD_NAME &&
      parsed.data.CLOUDINARY_API_KEY &&
      parsed.data.CLOUDINARY_API_SECRET,
  ),
};
