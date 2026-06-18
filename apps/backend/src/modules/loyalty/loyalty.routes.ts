import { Router } from 'express';
import { createLoyaltyProgramSchema } from '@feedo/types';
import { LoyaltyProgram } from '../../models/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateObjectId } from '../../middleware/params.js';
import { requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { crud } from '../../utils/crud.js';
import { asyncHandler } from '../../utils/http.js';

const handlers = crud({
  level: 'brand',
  model: LoyaltyProgram,
  createSchema: createLoyaltyProgramSchema,
  updateSchema: createLoyaltyProgramSchema.partial(),
  defaultSort: { createdAt: -1 },
});

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/', asyncHandler(handlers.list));
router.post('/', authorize('owner', 'manager', 'branch_manager'), asyncHandler(handlers.create));
router.get('/:id', validateObjectId(), asyncHandler(handlers.get));
router.patch('/:id', validateObjectId(), authorize('owner', 'manager', 'branch_manager'), asyncHandler(handlers.update));
router.delete('/:id', validateObjectId(), authorize('owner', 'manager', 'branch_manager'), asyncHandler(handlers.remove));

export default router;
