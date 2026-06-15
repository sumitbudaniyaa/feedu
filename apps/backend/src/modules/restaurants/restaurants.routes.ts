import { Router } from 'express';
import { onboardingStateSchema, updateRestaurantSchema } from '@feedo/types';
import { Restaurant, Subscription } from '../../models/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok } from '../../utils/http.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

// Current restaurant profile.
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const restaurant = await Restaurant.findById(req.restaurantId).lean();
    if (!restaurant) throw ApiError.notFound('Restaurant not found');
    return ok(res, restaurant);
  }),
);

// Current restaurant's subscription (read-only for the owner — billing is managed by Feedu).
router.get(
  '/me/subscription',
  asyncHandler(async (req, res) => {
    const sub = await Subscription.findOne({ restaurantId: req.restaurantId }).lean();
    return ok(res, sub);
  }),
);

// Update profile / branding / tax / timings.
router.patch(
  '/me',
  authorize('owner', 'manager'),
  validate(updateRestaurantSchema),
  asyncHandler(async (req, res) => {
    const restaurant = await Restaurant.findByIdAndUpdate(req.restaurantId, req.body, { new: true });
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
      req.restaurantId,
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
      req.restaurantId,
      { isLive: true, 'onboarding.completed': true, 'onboarding.progress': 100 },
      { new: true },
    );
    if (!restaurant) throw ApiError.notFound('Restaurant not found');
    return ok(res, restaurant);
  }),
);

export default router;
