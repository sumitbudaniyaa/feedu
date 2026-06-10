import { Router } from 'express';
import { Customer } from '../../models/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { asyncHandler, ok } from '../../utils/http.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

// Tracked diners for the restaurant, ranked by spend.
router.get(
  '/',
  authorize('owner', 'manager'),
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const filter: Record<string, unknown> = { restaurantId: req.restaurantId };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    const customers = await Customer.find(filter).sort({ totalSpent: -1 }).limit(200).lean();
    return ok(res, customers);
  }),
);

export default router;
