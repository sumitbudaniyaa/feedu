import { Router } from 'express';
import { z } from 'zod';
import { onboardingStateSchema, updateRestaurantSchema } from '@feedo/types';
import { slugify, randomToken } from '@feedo/utils';
import { Brand, Restaurant, Subscription } from '../../models/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { requireBrand, requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok } from '../../utils/http.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

// ─── Branches of the current brand (multi-branch) ──────────────────────────

// List every branch under the active brand (powers the branch switcher).
router.get(
  '/branches',
  requireBrand,
  asyncHandler(async (req, res) => {
    const branches = await Restaurant.find({ brandId: req.brandId })
      .select('name slug isLive contactNumber createdAt')
      .sort({ createdAt: 1 })
      .lean();
    return ok(res, branches);
  }),
);

// Add a new branch to the brand (brand owners/admins only).
router.post(
  '/branches',
  requireBrand,
  authorize('owner', 'brand_owner', 'brand_admin'),
  validate(z.object({ name: z.string().min(1), contactNumber: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const { name, contactNumber } = req.body as { name: string; contactNumber?: string };
    const brand = await Brand.findById(req.brandId).lean();
    if (!brand) throw ApiError.notFound('Brand not found');

    let slug = slugify(name);
    if (await Restaurant.exists({ slug })) slug = `${slug}-${randomToken(3)}`;

    const branch = await Restaurant.create({
      brandId: brand._id,
      ownerId: brand.ownerId,
      name,
      slug,
      contactNumber: contactNumber || undefined,
      branding: brand.branding,
      tax: brand.tax,
      currency: brand.currency,
      isLive: true,
      onboarding: { completed: true, currentStep: 0, progress: 100, completedSteps: [] },
    });
    return ok(res, branch, 201);
  }),
);

// Current restaurant profile.
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const restaurant = await Restaurant.findById(req.branchId).lean();
    if (!restaurant) throw ApiError.notFound('Restaurant not found');
    return ok(res, restaurant);
  }),
);

// Current restaurant's subscription (read-only for the owner — billing is managed by Feedu).
router.get(
  '/me/subscription',
  asyncHandler(async (req, res) => {
    const sub = await Subscription.findOne({ restaurantId: req.branchId }).lean();
    return ok(res, sub);
  }),
);

// Update profile / branding / tax / timings.
router.patch(
  '/me',
  authorize('owner', 'manager'),
  validate(updateRestaurantSchema),
  asyncHandler(async (req, res) => {
    const restaurant = await Restaurant.findByIdAndUpdate(req.branchId, req.body, { new: true });
    if (!restaurant) throw ApiError.notFound('Restaurant not found');
    return ok(res, restaurant);
  }),
);

// Persist onboarding progress.
router.patch(
  '/me/onboarding',
  authorize('owner'),
  validate(onboardingStateSchema.partial()),
  asyncHandler(async (req, res) => {
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.branchId,
      { $set: Object.fromEntries(Object.entries(req.body).map(([k, v]) => [`onboarding.${k}`, v])) },
      { new: true },
    );
    if (!restaurant) throw ApiError.notFound('Restaurant not found');
    return ok(res, restaurant);
  }),
);

// Flip the restaurant live (go-live step).
router.post(
  '/me/go-live',
  authorize('owner'),
  asyncHandler(async (req, res) => {
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.branchId,
      { isLive: true, 'onboarding.completed': true, 'onboarding.progress': 100 },
      { new: true },
    );
    if (!restaurant) throw ApiError.notFound('Restaurant not found');
    return ok(res, restaurant);
  }),
);

export default router;
