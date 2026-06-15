import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { requireBrand, requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { getBranchComparison, getBrandDashboardStats, getDashboardStats } from './analytics.service.js';

const BRAND_WIDE = new Set(['owner', 'brand_owner', 'brand_admin']);

const router = Router();
router.use(authenticate, resolveTenant);

router.get(
  '/dashboard',
  requireTenant,
  authorize('owner', 'manager', 'brand_owner', 'brand_admin', 'branch_manager'),
  asyncHandler(async (req, res) => {
    const range = (req.query.range as 'day' | 'week' | 'month') || 'week';
    // Brand-wide roles can ask for combined stats across every branch.
    if (req.query.scope === 'brand' && req.brandId && BRAND_WIDE.has(req.auth!.role)) {
      return ok(res, await getBrandDashboardStats(req.brandId, range));
    }
    return ok(res, await getDashboardStats(req.branchId!, range));
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
