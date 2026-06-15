import { Router } from 'express';
import { slugify } from '@feedo/utils';
import {
  Category,
  Customer,
  LoyaltyProgram,
  LoyaltyReward,
  Order,
  Product,
  Restaurant,
  Section,
  Subscription,
  SupportTicket,
  Table,
  User,
} from '../../models/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateObjectId } from '../../middleware/params.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok } from '../../utils/http.js';

const PAID = ['confirmed', 'preparing', 'ready', 'served', 'completed'];

const CYCLE_MONTHS: Record<string, number> = { monthly: 1, quarterly: 3, yearly: 12 };
/** Normalise a per-cycle price to monthly recurring revenue. */
function toMrr(price = 0, cycle = 'monthly'): number {
  return Math.round(price / (CYCLE_MONTHS[cycle] ?? 1));
}

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
    // Feedo's own SaaS revenue (what restaurants pay us), normalised to monthly.
    const saasMrr = subs.reduce((s, x) => s + toMrr(x.price, x.billingCycle), 0);
    const payingRestaurants = subs.filter((s) => (s.price ?? 0) > 0 && s.status === 'active').length;
    const totalMrr = saasMrr || subs.reduce((s, x) => s + (x.mrr ?? 0), 0);
    return ok(res, {
      totalMrr,
      saasMrr,
      saasArr: saasMrr * 12,
      payingRestaurants,
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

// Update a restaurant's subscription (plan / status / price / billing cycle / expiry).
router.patch(
  '/restaurants/:id/subscription',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const { plan, status, features, seats, price, billingCycle } =
      req.body as Record<string, unknown>;
    const update: Record<string, unknown> = { plan, status, features, seats };
    const cycle = (billingCycle as string) ?? undefined;
    if (price !== undefined) {
      update.price = Number(price);
      update.mrr = toMrr(Number(price), cycle ?? 'monthly');
    }
    if (cycle !== undefined) update.billingCycle = cycle;
    // Expiry is derived automatically from "now + billing duration" whenever the
    // price or cycle is (re)set — never entered by hand.
    if (price !== undefined || cycle !== undefined) {
      const existing = await Subscription.findOne({ restaurantId: req.params.id }).select('billingCycle').lean();
      const months = CYCLE_MONTHS[cycle ?? existing?.billingCycle ?? 'monthly'] ?? 1;
      update.currentPeriodEnd = new Date(Date.now() + months * 30 * 86400000);
    }
    // Drop undefined keys so we never overwrite with nulls.
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);
    const sub = await Subscription.findOneAndUpdate({ restaurantId: req.params.id }, update, {
      new: true,
      upsert: true,
    });
    return ok(res, sub);
  }),
);

// Onboard a new restaurant: owner user + restaurant + subscription (all-or-nothing-ish).
router.post(
  '/restaurants',
  asyncHandler(async (req, res) => {
    const {
      restaurantName,
      ownerName,
      email,
      password,
      contactNumber,
      price = 0,
      billingCycle = 'monthly',
      plan = 'starter',
      durationDays,
    } = req.body as Record<string, string | number>;

    if (!restaurantName || !ownerName || !email || !password) {
      throw ApiError.badRequest('restaurantName, ownerName, email and password are required');
    }
    if (contactNumber && !/^\d{10}$/.test(String(contactNumber))) {
      throw ApiError.badRequest('Mobile number must be 10 digits');
    }
    // Enforce uniqueness — no duplicate restaurant identity or owner login.
    const slug = slugify(String(restaurantName));
    if (await Restaurant.exists({ slug })) {
      throw ApiError.conflict('A restaurant with this name already exists');
    }
    if (await User.exists({ email: String(email).toLowerCase(), restaurantId: null })) {
      throw ApiError.conflict('An owner account with this email already exists');
    }

    const owner = await User.create({
      name: ownerName,
      email: String(email).toLowerCase(),
      passwordHash: await User.hashPassword(String(password)),
      role: 'owner',
    });
    const restaurant = await Restaurant.create({
      ownerId: owner._id,
      name: restaurantName,
      slug,
      contactNumber: contactNumber ? String(contactNumber) : undefined,
      isLive: true,
      onboarding: { completed: true, currentStep: 0, progress: 100, completedSteps: [] },
    });
    owner.restaurantId = restaurant._id;
    await owner.save();

    const days = Number(durationDays) || (CYCLE_MONTHS[String(billingCycle)] ?? 1) * 30;
    const sub = await Subscription.create({
      restaurantId: restaurant._id,
      plan,
      status: 'active',
      price: Number(price),
      billingCycle,
      mrr: toMrr(Number(price), String(billingCycle)),
      currentPeriodEnd: new Date(Date.now() + days * 86400000),
    });

    return ok(res, { restaurant, owner: { _id: owner._id, email: owner.email }, subscription: sub }, 201);
  }),
);

// Permanently delete a restaurant and all of its data.
router.delete(
  '/restaurants/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) throw ApiError.notFound('Restaurant not found');
    await Promise.all([
      Restaurant.deleteOne({ _id: id }),
      Subscription.deleteMany({ restaurantId: id }),
      User.deleteMany({ restaurantId: id }),
      Category.deleteMany({ restaurantId: id }),
      Product.deleteMany({ restaurantId: id }),
      Table.deleteMany({ restaurantId: id }),
      Order.deleteMany({ restaurantId: id }),
      Customer.deleteMany({ restaurantId: id }),
      Section.deleteMany({ restaurantId: id }),
      LoyaltyProgram.deleteMany({ restaurantId: id }),
      LoyaltyReward.deleteMany({ restaurantId: id }),
    ]);
    return ok(res, { deleted: true });
  }),
);

// All support tickets across the platform (optionally filter by status).
router.get(
  '/support',
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = {};
    if (typeof req.query.status === 'string' && req.query.status) filter.status = req.query.status;
    const tickets = await SupportTicket.find(filter).sort({ updatedAt: -1 }).limit(300).lean();
    return ok(res, tickets);
  }),
);

// Update a ticket's status and/or reply to it.
router.patch(
  '/support/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const { status, reply } = req.body as { status?: string; reply?: string };
    const update: Record<string, unknown> = {};
    if (status) update.status = status;
    const ops: Record<string, unknown> = { ...update };
    if (reply?.trim()) {
      ops.$push = { replies: { author: 'feedo', authorName: 'Feedo Support', message: reply.trim() } };
    }
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, ops, { new: true });
    if (!ticket) throw ApiError.notFound('Ticket not found');
    return ok(res, ticket);
  }),
);

// Super admin updates their own login credentials (name / email / password).
router.patch(
  '/account',
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body as Record<string, string>;
    const me = await User.findById(req.auth!.sub).select('+passwordHash');
    if (!me) throw ApiError.notFound('Account not found');
    if (email && email.toLowerCase() !== me.email) {
      if (await User.exists({ email: email.toLowerCase() })) {
        throw ApiError.conflict('That email is already in use');
      }
      me.email = email.toLowerCase();
    }
    if (name) me.name = name;
    if (password) me.passwordHash = await User.hashPassword(password);
    await me.save();
    return ok(res, { _id: me._id, name: me.name, email: me.email, role: me.role });
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
