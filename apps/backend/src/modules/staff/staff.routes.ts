import { Router } from 'express';
import { createStaffSchema } from '@feedo/types';
import { User } from '../../models/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateObjectId } from '../../middleware/params.js';
import { validate } from '../../middleware/validate.js';
import { requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok } from '../../utils/http.js';

const STAFF_ROLES = ['manager', 'kitchen', 'waiter'];

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

// List staff for the restaurant (owner + staff roles, excluding customers).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const staff = await User.find({
      restaurantId: req.restaurantId,
      role: { $in: ['owner', ...STAFF_ROLES] },
    })
      .sort({ createdAt: 1 })
      .lean();
    return ok(res, staff);
  }),
);

router.post(
  '/',
  authorize('owner', 'manager'),
  validate(createStaffSchema),
  asyncHandler(async (req, res) => {
    const exists = await User.findOne({ email: req.body.email, restaurantId: req.restaurantId });
    if (exists) throw ApiError.conflict('A staff member with this email already exists');

    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      role: req.body.role,
      permissions: req.body.permissions ?? [],
      restaurantId: req.restaurantId,
      passwordHash: await User.hashPassword(req.body.password),
    });
    return ok(res, user.toJSON(), 201);
  }),
);

router.patch(
  '/:id',
  validateObjectId(),
  authorize('owner', 'manager'),
  asyncHandler(async (req, res) => {
    const { name, email, phone, password, role, permissions, isActive } = req.body as Record<string, unknown>;
    if (role && !STAFF_ROLES.includes(role as string)) throw ApiError.badRequest('Invalid role');

    // Only set provided fields (Mongoose skips undefined paths on update).
    const update: Record<string, unknown> = { name, phone, role, permissions, isActive };
    if (typeof email === 'string' && email) {
      const taken = await User.findOne({
        email: email.toLowerCase(),
        restaurantId: req.restaurantId,
        _id: { $ne: req.params.id },
      });
      if (taken) throw ApiError.conflict('Another staff member already uses this email');
      update.email = email.toLowerCase();
    }
    if (typeof password === 'string' && password) {
      if (password.length < 8) throw ApiError.badRequest('Password must be at least 8 characters');
      update.passwordHash = await User.hashPassword(password);
    }
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.restaurantId, role: { $ne: 'owner' } },
      update,
      { new: true },
    );
    if (!user) throw ApiError.notFound('Staff member not found');
    return ok(res, user.toJSON());
  }),
);

router.delete(
  '/:id',
  validateObjectId(),
  authorize('owner', 'manager'),
  asyncHandler(async (req, res) => {
    const user = await User.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.restaurantId,
      role: { $ne: 'owner' },
    });
    if (!user) throw ApiError.notFound('Staff member not found');
    return ok(res, { _id: req.params.id });
  }),
);

export default router;
