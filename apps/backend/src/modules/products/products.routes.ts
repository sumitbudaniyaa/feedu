import { Router } from 'express';
import { createProductSchema, updateProductSchema } from '@feedo/types';
import { Product } from '../../models/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateObjectId } from '../../middleware/params.js';
import { requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { crud } from '../../utils/crud.js';
import { asyncHandler } from '../../utils/http.js';

const handlers = crud({
  level: 'brand',
  model: Product,
  createSchema: createProductSchema,
  updateSchema: updateProductSchema,
  defaultSort: { createdAt: -1 },
  searchFields: ['name', 'tags'],
  // Optional ?categoryId= filter.
  baseFilter: (req) =>
    typeof req.query.categoryId === 'string' && req.query.categoryId
      ? { categoryId: req.query.categoryId }
      : {},
});

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/', asyncHandler(handlers.list));
router.post('/', authorize('owner', 'manager', 'branch_manager'), asyncHandler(handlers.create));
router.get('/:id', validateObjectId(), asyncHandler(handlers.get));
router.patch('/:id', validateObjectId(), authorize('owner', 'manager', 'branch_manager'), asyncHandler(handlers.update));
router.delete('/:id', validateObjectId(), authorize('owner', 'manager', 'branch_manager'), asyncHandler(handlers.remove));

export default router;
