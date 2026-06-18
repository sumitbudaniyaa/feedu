import { Router } from 'express';
import { z } from 'zod';
import { onboardingStateSchema, updateRestaurantSchema } from '@feedo/types';
import { slugify, randomToken } from '@feedo/utils';
import {
  BranchMenu,
  Brand,
  Customer,
  Order,
  Restaurant,
  Subscription,
  Table,
  User,
} from '../../models/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { validateObjectId } from '../../middleware/params.js';
import { requireBrand, requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { findEffectiveSubscription } from '../../utils/subscription.js';
import { resolveBranchFeatures } from '../../utils/features.js';

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

// ─── Branch managers (brand-wide roles create per-branch logins) ───────────

/** Confirm a branch belongs to the active brand; returns it or 404s. */
async function brandBranchOr404(brandId: string | undefined, branchId: string) {
  const branch = await Restaurant.findOne({ _id: branchId, brandId }).lean();
  if (!branch) throw ApiError.notFound('Branch not found');
  return branch;
}

// List a branch's managers/staff (brand-wide roles, branch must be in the brand).
router.get(
  '/branches/:id/managers',
  requireBrand,
  authorize('owner', 'brand_owner', 'brand_admin'),
  validateObjectId(),
  asyncHandler(async (req, res) => {
    await brandBranchOr404(req.brandId, req.params.id!);
    const managers = await User.find({
      restaurantId: req.params.id,
      role: { $in: ['branch_manager', 'manager'] },
    })
      .sort({ createdAt: 1 })
      .lean();
    return ok(res, managers);
  }),
);

// Create a branch-manager login for a specific branch.
router.post(
  '/branches/:id/managers',
  requireBrand,
  authorize('owner', 'brand_owner', 'brand_admin'),
  validateObjectId(),
  validate(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      password: z.string().min(8),
    }),
  ),
  asyncHandler(async (req, res) => {
    const branch = await brandBranchOr404(req.brandId, req.params.id!);
    const { name, email, phone, password } = req.body as {
      name: string;
      email: string;
      phone?: string;
      password: string;
    };
    const lower = email.toLowerCase();
    if (await User.exists({ email: lower, restaurantId: branch._id })) {
      throw ApiError.conflict('A user with this email already exists for this branch');
    }
    // The branch manager is locked to this branch — restaurantId = the branch,
    // role branch_manager (not brand-wide), so their token can't switch branches.
    const user = await User.create({
      name,
      email: lower,
      phone: phone || undefined,
      role: 'branch_manager',
      restaurantId: branch._id,
      brandId: branch.brandId,
      passwordHash: await User.hashPassword(password),
    });
    return ok(res, user.toJSON(), 201);
  }),
);

// Edit a branch (name / contact / live state) — brand-wide roles.
router.patch(
  '/branches/:id',
  requireBrand,
  authorize('owner', 'brand_owner', 'brand_admin'),
  validateObjectId(),
  validate(
    z.object({
      name: z.string().min(1).optional(),
      contactNumber: z.string().optional(),
      isLive: z.boolean().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    await brandBranchOr404(req.brandId, req.params.id!);
    const { name, contactNumber, isLive } = req.body as {
      name?: string;
      contactNumber?: string;
      isLive?: boolean;
    };
    const update: Record<string, unknown> = { name, contactNumber, isLive };
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);
    const branch = await Restaurant.findByIdAndUpdate(req.params.id, update, { new: true });
    return ok(res, branch);
  }),
);

// Delete a branch + its branch-scoped data (never the brand's last branch).
router.delete(
  '/branches/:id',
  requireBrand,
  authorize('owner', 'brand_owner', 'brand_admin'),
  validateObjectId(),
  asyncHandler(async (req, res) => {
    await brandBranchOr404(req.brandId, req.params.id!);
    const count = await Restaurant.countDocuments({ brandId: req.brandId });
    if (count <= 1) throw ApiError.badRequest('A brand must keep at least one branch');
    const id = req.params.id;
    await Promise.all([
      Restaurant.deleteOne({ _id: id }),
      User.deleteMany({ restaurantId: id }),
      Table.deleteMany({ restaurantId: id }),
      Order.deleteMany({ restaurantId: id }),
      Customer.deleteMany({ restaurantId: id }),
      BranchMenu.deleteMany({ branchId: id }),
      Subscription.deleteMany({ restaurantId: id }),
    ]);
    return ok(res, { deleted: true });
  }),
);

// Edit a branch manager (name / phone / password / active).
router.patch(
  '/branches/:id/managers/:userId',
  requireBrand,
  authorize('owner', 'brand_owner', 'brand_admin'),
  validateObjectId(),
  validateObjectId('userId'),
  asyncHandler(async (req, res) => {
    await brandBranchOr404(req.brandId, req.params.id!);
    const { name, phone, password, isActive } = req.body as {
      name?: string;
      phone?: string;
      password?: string;
      isActive?: boolean;
    };
    const update: Record<string, unknown> = { name, phone, isActive };
    if (typeof password === 'string' && password) {
      if (password.length < 8) throw ApiError.badRequest('Password must be at least 8 characters');
      update.passwordHash = await User.hashPassword(password);
    }
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);
    const user = await User.findOneAndUpdate(
      { _id: req.params.userId, restaurantId: req.params.id, role: { $in: ['branch_manager', 'manager'] } },
      update,
      { new: true },
    );
    if (!user) throw ApiError.notFound('Manager not found');
    return ok(res, user.toJSON());
  }),
);

// Remove a branch manager.
router.delete(
  '/branches/:id/managers/:userId',
  requireBrand,
  authorize('owner', 'brand_owner', 'brand_admin'),
  validateObjectId(),
  validateObjectId('userId'),
  asyncHandler(async (req, res) => {
    await brandBranchOr404(req.brandId, req.params.id!);
    const user = await User.findOneAndDelete({
      _id: req.params.userId,
      restaurantId: req.params.id,
      role: { $in: ['branch_manager', 'manager'] },
    });
    if (!user) throw ApiError.notFound('Manager not found');
    return ok(res, { _id: req.params.userId });
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

// Current restaurant's subscription (read-only for the owner — billing is managed
// by Feedu). For a multi-store brand this resolves to the brand's combined plan.
router.get(
  '/me/subscription',
  asyncHandler(async (req, res) => {
    const sub = await findEffectiveSubscription(req.branchId, req.brandId);
    return ok(res, sub);
  }),
);

// The active brand (tenant) for the signed-in account: account type + branch count.
// Drives whether the admin shows multi-branch features.
router.get(
  '/me/brand',
  asyncHandler(async (req, res) => {
    if (!req.brandId) return ok(res, null);
    const [brand, branchCount] = await Promise.all([
      Brand.findById(req.brandId).lean(),
      Restaurant.countDocuments({ brandId: req.brandId }),
    ]);
    if (!brand) return ok(res, null);
    return ok(res, {
      _id: String(brand._id),
      name: brand.name,
      slug: brand.slug,
      accountType: brand.accountType ?? 'single',
      description: brand.description ?? '',
      cuisineType: brand.cuisineType ?? [],
      branding: brand.branding,
      tax: brand.tax,
      currency: brand.currency,
      branchCount,
    });
  }),
);

// Effective feature set + limits for the active branch (drives admin UI gating).
router.get(
  '/me/features',
  asyncHandler(async (req, res) => {
    const [features, sub] = await Promise.all([
      resolveBranchFeatures(req.branchId, req.brandId),
      findEffectiveSubscription(req.branchId, req.brandId),
    ]);
    const limits = sub?.limits
      ? sub.limits instanceof Map
        ? Object.fromEntries(sub.limits)
        : sub.limits
      : {};
    return ok(res, { features: [...features], limits });
  }),
);

// Update the brand (name / branding / tax / currency) — applies to ALL branches.
router.patch(
  '/me/brand',
  requireBrand,
  authorize('owner', 'brand_owner', 'brand_admin'),
  validate(
    z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      cuisineType: z.array(z.string()).optional(),
      branding: z
        .object({
          accent: z.enum(['emerald', 'violet', 'blue', 'amber', 'rose', 'slate']).optional(),
          themeMode: z.enum(['dark', 'light']).optional(),
        })
        .optional(),
      tax: z
        .object({
          gstNumber: z.string().optional(),
          gstPercent: z.number().min(0).max(100).optional(),
          inclusive: z.boolean().optional(),
        })
        .optional(),
      currency: z.string().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const brand = await Brand.findByIdAndUpdate(req.brandId, body, { new: true });
    if (!brand) throw ApiError.notFound('Brand not found');
    // Branding/tax/currency are shared — propagate to every branch so the
    // customer app theme and order GST stay in sync across the brand.
    const propagate: Record<string, unknown> = {};
    if (body.branding !== undefined) propagate.branding = brand.branding;
    if (body.tax !== undefined) propagate.tax = brand.tax;
    if (body.currency !== undefined) propagate.currency = brand.currency;
    if (Object.keys(propagate).length) {
      await Restaurant.updateMany({ brandId: req.brandId }, propagate);
    }
    return ok(res, brand);
  }),
);

// Update profile / branding / tax / timings.
router.patch(
  '/me',
  authorize('owner', 'manager', 'branch_manager'),
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
