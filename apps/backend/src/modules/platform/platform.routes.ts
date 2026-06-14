import { Router } from 'express';
import { Customer, Order, Product, Restaurant, Subscription, User } from '../../models/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateObjectId } from '../../middleware/params.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok } from '../../utils/http.js';

const PAID = ['confirmed', 'preparing', 'ready', 'served', 'completed'];

const router = Router();
// Platform endpoints are NOT tenant-scoped — super admin only.
router.use(authenticate, authorize('super_admin'));

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [subs, restaurantCount, liveCount, staffCount, customerCount, revenueAgg, orderCount] =
      await Promise.all([
        Subscription.find().lean(),
        Restaurant.countDocuments(),
        Restaurant.countDocuments({ isLive: true }),
        User.countDocuments({ role: { $in: ['owner', 'manager', 'kitchen', 'waiter'] } }),
        Customer.countDocuments(),
        Order.aggregate([
          { $match: { status: { $in: PAID } } },
          { $group: { _id: null, revenue: { $sum: '$total' } } },
        ]),
        Order.countDocuments(),
      ]);
    const totalMrr = subs.reduce((s, x) => s + (x.mrr ?? 0), 0);
    return ok(res, {
      totalMrr,
      restaurants: restaurantCount,
      liveRestaurants: liveCount,
      activeStaff: staffCount,
      customers: customerCount,
      orders: orderCount,
      gmv: revenueAgg[0]?.revenue ?? 0,
      activeSubscriptions: subs.filter((s) => s.status === 'active').length,
      trialing: subs.filter((s) => s.status === 'trialing').length,
    });
  }),
);

// Platform-wide GMV + orders trend (last 14 days).
router.get(
  '/analytics',
  asyncHandler(async (_req, res) => {
    const start = new Date();
    start.setDate(start.getDate() - 13);
    start.setHours(0, 0, 0, 0);
    const series = await Order.aggregate([
      { $match: { status: { $in: PAID }, placedAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$placedAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const [topRestaurants, channels] = await Promise.all([
      Order.aggregate([
        { $match: { status: { $in: PAID } } },
        { $group: { _id: '$restaurantId', revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'restaurants', localField: '_id', foreignField: '_id', as: 'r' } },
        { $project: { revenue: 1, orders: 1, name: { $arrayElemAt: ['$r.name', 0] } } },
      ]),
      Order.aggregate([
        { $match: { status: { $in: PAID } } },
        { $group: { _id: '$channel', orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $sort: { revenue: -1 } },
      ]),
    ]);
    return ok(res, {
      series: series.map((s) => ({ date: s._id, revenue: s.revenue, orders: s.orders })),
      topRestaurants: topRestaurants.map((t) => ({
        restaurantId: String(t._id),
        name: t.name ?? 'Unknown',
        revenue: t.revenue,
        orders: t.orders,
      })),
      channelMix: channels.map((c) => ({
        channel: (c._id as string) ?? 'app',
        orders: c.orders,
        revenue: c.revenue,
      })),
    });
  }),
);

// All users across the platform (optionally filter by role/search).
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = {};
    if (typeof req.query.role === 'string' && req.query.role) filter.role = req.query.role;
    if (typeof req.query.search === 'string' && req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    const [users, restaurants] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).limit(200).lean(),
      Restaurant.find().select('name').lean(),
    ]);
    const rName = new Map(restaurants.map((r) => [String(r._id), r.name]));
    return ok(
      res,
      users.map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        restaurantId: u.restaurantId ? String(u.restaurantId) : null,
        restaurantName: u.restaurantId ? (rName.get(String(u.restaurantId)) ?? null) : null,
      })),
    );
  }),
);

// All orders across the platform (most recent).
router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 60));
    const [orders, restaurants] = await Promise.all([
      Order.find().sort({ placedAt: -1 }).limit(limit).lean(),
      Restaurant.find().select('name').lean(),
    ]);
    const rName = new Map(restaurants.map((r) => [String(r._id), r.name]));
    return ok(
      res,
      orders.map((o) => ({ ...o, restaurantName: rName.get(String(o.restaurantId)) ?? null })),
    );
  }),
);

// All customers across the platform (ranked by spend).
router.get(
  '/customers',
  asyncHandler(async (_req, res) => {
    const [customers, restaurants] = await Promise.all([
      Customer.find().sort({ totalSpent: -1 }).limit(200).lean(),
      Restaurant.find().select('name').lean(),
    ]);
    const rName = new Map(restaurants.map((r) => [String(r._id), r.name]));
    return ok(
      res,
      customers.map((c) => ({ ...c, restaurantName: rName.get(String(c.restaurantId)) ?? null })),
    );
  }),
);

// Full detail for one restaurant.
router.get(
  '/restaurants/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const restaurant = await Restaurant.findById(req.params.id).lean();
    if (!restaurant) throw ApiError.notFound('Restaurant not found');
    const id = restaurant._id;
    const [subscription, staff, productCount, customerCount, recentOrders, revenueAgg] =
      await Promise.all([
        Subscription.findOne({ restaurantId: id }).lean(),
        User.find({ restaurantId: id, role: { $in: ['owner', 'manager', 'kitchen', 'waiter'] } })
          .sort({ createdAt: 1 })
          .lean(),
        Product.countDocuments({ restaurantId: id }),
        Customer.countDocuments({ restaurantId: id }),
        Order.find({ restaurantId: id }).sort({ placedAt: -1 }).limit(10).lean(),
        Order.aggregate([
          { $match: { restaurantId: id, status: { $in: PAID } } },
          { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
        ]),
      ]);
    return ok(res, {
      restaurant,
      subscription,
      staff: staff.map((u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role, isActive: u.isActive })),
      productCount,
      customerCount,
      recentOrders,
      revenue: revenueAgg[0]?.revenue ?? 0,
      paidOrders: revenueAgg[0]?.orders ?? 0,
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
