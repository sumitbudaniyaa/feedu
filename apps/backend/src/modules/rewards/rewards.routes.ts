import { Router } from 'express';
import { createLoyaltyRewardSchema, objectIdSchema } from '@feedo/types';
import { LoyaltyReward, Redemption } from '../../models/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateObjectId } from '../../middleware/params.js';
import { requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { ApiError } from '../../utils/ApiError.js';
import { crud } from '../../utils/crud.js';
import { asyncHandler, ok } from '../../utils/http.js';

// A reward must be tied to a menu item so it can be ordered for free in-app.
const createSchema = createLoyaltyRewardSchema.extend({ productId: objectIdSchema });

const handlers = crud({
  level: 'brand',
  model: LoyaltyReward,
  createSchema,
  updateSchema: createSchema.partial(),
  defaultSort: { pointsCost: 1 },
});

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

// Redemptions (claims) — list + fulfil. Declared before /:id routes.
router.get(
  '/redemptions',
  authorize('owner', 'manager'),
  asyncHandler(async (req, res) => {
    const redemptions = await Redemption.find({ restaurantId: req.restaurantId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return ok(res, redemptions);
  }),
);

router.patch(
  '/redemptions/:id',
  validateObjectId(),
  authorize('owner', 'manager'),
  asyncHandler(async (req, res) => {
    const { status } = req.body as { status?: string };
    if (!status || !['fulfilled', 'cancelled'].includes(status)) {
      throw ApiError.badRequest('status must be fulfilled or cancelled');
    }
    const redemption = await Redemption.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId, status: 'pending' },
      { status },
      { new: true },
    );
    if (!redemption) throw ApiError.notFound('Pending redemption not found');
    return ok(res, redemption);
  }),
);

router.get('/', asyncHandler(handlers.list));
router.post('/', authorize('owner', 'manager'), asyncHandler(handlers.create));
router.patch('/:id', validateObjectId(), authorize('owner', 'manager'), asyncHandler(handlers.update));
router.delete('/:id', validateObjectId(), authorize('owner', 'manager'), asyncHandler(handlers.remove));

export default router;
