import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { getDashboardStats } from './analytics.service.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get(
  '/dashboard',
  authorize('owner', 'manager'),
  asyncHandler(async (req, res) => {
    const range = (req.query.range as 'day' | 'week' | 'month') || 'week';
    return ok(res, await getDashboardStats(req.restaurantId!, range));
  }),
);

export default router;
