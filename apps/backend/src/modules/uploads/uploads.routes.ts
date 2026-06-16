import path from 'node:path';
import fs from 'node:fs';
import { Router } from 'express';
import multer from 'multer';
import { randomToken } from '@feedo/utils';
import { authenticate, authorize } from '../../middleware/auth.js';
import { resolveTenant } from '../../middleware/tenant.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok } from '../../utils/http.js';

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${randomToken(8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

const router = Router();

// Authenticated, tenant-scoped image upload. Returns an absolute URL.
router.post(
  '/',
  authenticate,
  resolveTenant,
  authorize('owner', 'manager', 'branch_manager'),
  (req, res, next) => {
    upload.single('file')(req, res, (err: unknown) => {
      if (err) return next(ApiError.badRequest(err instanceof Error ? err.message : 'Upload failed'));
      if (!req.file) return next(ApiError.badRequest('No file provided'));
      const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      return ok(res, { url }, 201);
    });
  },
);

export default router;
