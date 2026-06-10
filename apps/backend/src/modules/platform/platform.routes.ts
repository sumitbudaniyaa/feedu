import { Router } from 'express';
import { Order, Restaurant, Subscription, User } from '../../models/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateObjectId } from '../../middleware/params.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok } from '../../utils/http.js';

const router = Router();
// Platform endpoints are NOT tenant-scoped — super admin only.
router.use(authenticate, authorize('super_admin'));

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [subs, restaurantCount, staffCount] = await Promise.all([
      Subscription.find().lean(),
      Restaurant.countDocuments(),
      User.countDocuments({ role: { $in: ['owner', 'manager', 'kitchen', 'waiter'] } }),
    ]);
    const totalMrr = subs.reduce((s, x) => s + (x.mrr ?? 0), 0);
    const activeSubs = subs.filter((s) => s.status === 'active').length;
    return ok(res, {
      totalMrr,
      restaurants: restaurantCount,
      activeStaff: staffCount,
      activeSubscriptions: activeSubs,
      trialing: subs.filter((s) => s.status === 'trialing').length,
    });
  }),
);

router.get(
  '/restaurants',
  asyncHandler(async (_req, res) => {
    const restaurants = await Restaurant.find().sort({ createdAt: -1 }).lean();
    const [subs, orderCounts] = await Promise.all([
      Subscription.find().lean(),
      Order.aggregate([{ $group: { _id: '$restaurantId', count: { $sum: 1 } } }]),
    ]);
    const subByR = new Map(subs.map((s) => [String(s.restaurantId), s]));
    const ordersByR = new Map(orderCounts.map((o) => [String(o._id), o.count]));

    const data = restaurants.map((r) => ({
      _id: r._id,
      name: r.name,
      slug: r.slug,
      isLive: r.isLive,
      createdAt: r.createdAt,
      subscription: subByR.get(String(r._id)) ?? null,
      orderCount: ordersByR.get(String(r._id)) ?? 0,
    }));
    return ok(res, data);
  }),
);

// Update a restaurant's subscription (plan / status / feature flags / mrr).
router.patch(
  '/restaurants/:id/subscription',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const { plan, status, features, mrr, seats } = req.body as Record<string, unknown>;
    const sub = await Subscription.findOneAndUpdate(
      { restaurantId: req.params.id },
      { plan, status, features, mrr, seats },
      { new: true, upsert: true },
    );
    return ok(res, sub);
  }),
);

// Suspend / reactivate a restaurant.
router.patch(
  '/restaurants/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const { isLive } = req.body as { isLive?: boolean };
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { isLive },
      { new: true },
    );
    if (!restaurant) throw ApiError.notFound('Restaurant not found');
    return ok(res, restaurant);
  }),
);

export default router;
