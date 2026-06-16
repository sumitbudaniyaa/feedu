import path from 'node:path';
import fs from 'node:fs';
import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { randomToken } from '@feedo/utils';
import { env } from '../../config/env.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { resolveTenant } from '../../middleware/tenant.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok } from '../../utils/http.js';
import { logger } from '../../utils/logger.js';

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Configure Cloudinary once if credentials are present.
if (env.cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// Buffer the file in memory; we either stream it to Cloudinary or write it to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

/** Upload a buffer to Cloudinary and resolve its secure URL. */
function uploadToCloudinary(buffer: Buffer, brandId: string | undefined): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      // Group images by brand/tenant; deliver optimized format + quality.
      { folder: `feedu/${brandId ?? 'shared'}`, resource_type: 'image' },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

const router = Router();

// Authenticated, tenant-scoped image upload. Returns an absolute URL.
// Uses Cloudinary when configured; otherwise stores under local /uploads (dev).
router.post(
  '/',
  authenticate,
  resolveTenant,
  authorize('owner', 'manager', 'branch_manager'),
  (req, res, next) => {
    upload.single('file')(req, res, async (err: unknown) => {
      try {
        if (err) throw ApiError.badRequest(err instanceof Error ? err.message : 'Upload failed');
        if (!req.file) throw ApiError.badRequest('No file provided');

        if (env.cloudinaryConfigured) {
          const url = await uploadToCloudinary(req.file.buffer, req.brandId);
          return ok(res, { url }, 201);
        }

        // Local fallback (dev without Cloudinary keys).
        const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
        const filename = `${Date.now()}-${randomToken(8)}${ext}`;
        fs.writeFileSync(path.join(UPLOADS_DIR, filename), req.file.buffer);
        const url = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
        return ok(res, { url }, 201);
      } catch (e) {
        if (e instanceof ApiError) return next(e);
        logger.error('Image upload failed', e);
        return next(ApiError.internal('Image upload failed'));
      }
    });
  },
);

export default router;
