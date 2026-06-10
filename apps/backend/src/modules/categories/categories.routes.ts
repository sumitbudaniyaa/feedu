import { Router } from 'express';
import { createCategorySchema, updateCategorySchema } from '@feedo/types';
import { Category } from '../../models/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateObjectId } from '../../middleware/params.js';
import { requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { crud } from '../../utils/crud.js';
import { asyncHandler } from '../../utils/http.js';

const handlers = crud({
  model: Category,
  createSchema: createCategorySchema,
  updateSchema: updateCategorySchema,
  defaultSort: { order: 1, createdAt: 1 },
  searchFields: ['name'],
});

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/', asyncHandler(handlers.list));
router.post('/', authorize('owner', 'manager'), asyncHandler(handlers.create));
router.get('/:id', validateObjectId(), asyncHandler(handlers.get));
router.patch('/:id', validateObjectId(), authorize('owner', 'manager'), asyncHandler(handlers.update));
router.delete('/:id', validateObjectId(), authorize('owner', 'manager'), asyncHandler(handlers.remove));

export default router;
