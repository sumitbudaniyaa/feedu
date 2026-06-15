import { Router } from 'express';
import { createTableSchema, generateTablesSchema } from '@feedo/types';
import { randomToken } from '@feedo/utils';
import { Table } from '../../models/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateObjectId } from '../../middleware/params.js';
import { validate } from '../../middleware/validate.js';
import { requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { crud } from '../../utils/crud.js';
import { asyncHandler, ok } from '../../utils/http.js';

const handlers = crud({
  model: Table,
  defaultSort: { createdAt: 1 },
  searchFields: ['name'],
});

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/', asyncHandler(handlers.list));

router.post(
  '/',
  authorize('owner', 'manager'),
  validate(createTableSchema),
  asyncHandler(async (req, res) => {
    const table = await Table.create({
      restaurantId: req.branchId,
      name: req.body.name,
      seats: req.body.seats ?? 2,
      qrToken: randomToken(10),
    });
    return ok(res, table, 201);
  }),
);

// Bulk-generate tables (onboarding). Each gets a unique QR token.
router.post(
  '/generate',
  authorize('owner', 'manager'),
  validate(generateTablesSchema),
  asyncHandler(async (req, res) => {
    const { count, prefix } = req.body as { count: number; prefix: string };
    const existing = await Table.countDocuments({ restaurantId: req.branchId });
    const docs = Array.from({ length: count }, (_, i) => ({
      restaurantId: req.branchId,
      name: `${prefix} ${existing + i + 1}`,
      qrToken: randomToken(10),
    }));
    const created = await Table.insertMany(docs);
    return ok(res, created, 201);
  }),
);

router.patch('/:id', validateObjectId(), authorize('owner', 'manager'), asyncHandler(handlers.update));
router.delete('/:id', validateObjectId(), authorize('owner', 'manager'), asyncHandler(handlers.remove));

export default router;
