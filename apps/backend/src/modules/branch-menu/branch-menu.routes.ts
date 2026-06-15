import { Router } from 'express';
import { z } from 'zod';
import { BranchMenu } from '../../models/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateObjectId } from '../../middleware/params.js';
import { validate } from '../../middleware/validate.js';
import { requireBrand, requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { resolveBranchMenu } from '../menu/menu.service.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant, requireBrand);

// Effective menu for the active branch (brand catalog merged with this branch's overrides).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const menu = await resolveBranchMenu({ brandId: req.brandId, branchId: req.branchId! });
    return ok(res, menu);
  }),
);

// Raw overrides for the active branch (admin editing view).
router.get(
  '/overrides',
  asyncHandler(async (req, res) => {
    const overrides = await BranchMenu.find({ branchId: req.branchId }).lean();
    return ok(res, overrides);
  }),
);

const overrideSchema = z.object({
  priceOverride: z.number().min(0).nullable().optional(),
  isAvailable: z.boolean().optional(),
  stock: z.number().int().min(0).nullable().optional(),
  branchExclusive: z.boolean().optional(),
});

// Upsert this branch's override for a product.
router.patch(
  '/:productId',
  authorize('owner', 'manager', 'brand_owner', 'brand_admin', 'branch_manager'),
  validateObjectId('productId'),
  validate(overrideSchema),
  asyncHandler(async (req, res) => {
    const doc = await BranchMenu.findOneAndUpdate(
      { brandId: req.brandId, branchId: req.branchId, productId: req.params.productId },
      { $set: req.body, $setOnInsert: { brandId: req.brandId, branchId: req.branchId, productId: req.params.productId } },
      { new: true, upsert: true },
    );
    return ok(res, doc);
  }),
);

export default router;
