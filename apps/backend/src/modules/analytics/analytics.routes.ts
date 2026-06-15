import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { requireBrand, requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { getBranchComparison, getDashboardStats } from './analytics.service.js';

const router = Router();
router.use(authenticate, resolveTenant);

router.get(
  '/dashboard',
  requireTenant,
  authorize('owner', 'manager', 'brand_owner', 'brand_admin', 'branch_manager'),
  asyncHandler(async (req, res) => {
    const range = (req.query.range as 'day' | 'week' | 'month') || 'week';
    return ok(res, await getDashboardStats(req.restaurantId!, range));
  }),
);

// Brand-wide branch comparison (revenue/orders per branch across the brand).
router.get(
  '/branches',
  requireBrand,
  authorize('owner', 'brand_owner', 'brand_admin'),
  asyncHandler(async (req, res) => {
    const range = (req.query.range as 'day' | 'week' | 'month') || 'week';
    if (!req.brandId) throw ApiError.badRequest('Brand context required');
    return ok(res, await getBranchComparison(req.brandId, range));
  }),
);

export default router;
