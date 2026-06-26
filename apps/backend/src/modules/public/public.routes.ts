import { Router } from 'express';
import { z } from 'zod';
import { cartItemSchema, createLeadSchema, createOrderSchema, orderTypeSchema, phoneSchema, SOCKET_EVENTS, rooms } from '@feedo/types';
import bcrypt from 'bcryptjs';
import {
  Brand,
  Customer,
  Favorite,
  Lead,
  LoyaltyReward,
  Order,
  Otp,
  Redemption,
  Restaurant,
  Subscription,
  Table,
} from '../../models/index.js';
import { isValidObjectId } from 'mongoose';
import { randomToken } from '@feedo/utils';
import { validate } from '../../middleware/validate.js';
import { optionalCustomerAuth, requireCustomer } from '../../middleware/customer.js';
import { resolveBranchMenu } from '../menu/menu.service.js';
import { otpLimiter } from '../../middleware/security.js';
import { ApiError } from '../../utils/ApiError.js';
import { signCustomerToken } from '../../utils/jwt.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';
import * as orders from '../orders/orders.service.js';
import { ensureSession, requestBill } from '../tables/sessions.service.js';
import { createRazorpayOrder, isDemoMode, verifyPaymentSignature } from '../payments/payments.service.js';
import { getIO } from '../../sockets/index.js';

const router = Router();

// OTP throttling (per phone): code validity, resend cooldown, and a rolling-window send cap.
const OTP_CODE_TTL_MS = 5 * 60 * 1000; // code valid for 5 min
const OTP_WINDOW_MS = 15 * 60 * 1000; // rolling window for the send cap
const OTP_MAX_PER_WINDOW = 3; // max codes per number per window

// ─── Call a waiter to a table (assistance or bill request) ─────────────────
router.post(
  '/r/:slug/call-waiter',
  validate(z.object({ tableName: z.string().min(1), reason: z.enum(['assistance', 'bill']).optional() })),
  asyncHandler(async (req, res) => {
    const restaurant = await Restaurant.findOne({ slug: req.params.slug }).select('_id brandId').lean();
    if (!restaurant) throw ApiError.notFound('Restaurant not found');
    const { tableName, reason } = req.body as { tableName: string; reason?: 'assistance' | 'bill' };
    const io = getIO() as unknown as {
      to: (room: string) => { emit: (event: string, payload: unknown) => void };
    };
    io.to(rooms.restaurant(String(restaurant._id))).emit(SOCKET_EVENTS.WAITER_CALLED, {
      tableName,
      at: new Date().toISOString(),
      reason: reason ?? 'assistance',
    });
    // A bill request also flags the table's live session as ready to settle.
    if (reason === 'bill') {
      const table = await Table.findOne({ restaurantId: restaurant._id, name: tableName }).select('_id').lean();
      if (table) {
        await requestBill(
          String(restaurant._id),
          String(table._id),
          restaurant.brandId ? String(restaurant.brandId) : null,
        ).catch(() => undefined);
      }
    }
    return ok(res, { called: true });
  }),
);

/** Block diner access when the restaurant's Feedu subscription is inactive/expired. */
async function assertSubscriptionActive(restaurantId: string) {
  const sub = await Subscription.findOne({ restaurantId }).select('status currentPeriodEnd').lean();
  if (!sub) return; // legacy / no subscription on file — don't block
  const expired = sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < new Date();
  if (sub.status === 'past_due' || sub.status === 'cancelled' || expired) {
    throw ApiError.notFound('This restaurant is currently unavailable');
  }
}

// ─── Customer OTP login ──────────────────────────────────────────────────
router.post(
  '/auth/otp/request',
  otpLimiter,
  validate(z.object({ phone: phoneSchema, name: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const { phone, name } = req.body as { phone: string; name?: string };
    const now = Date.now();

    // Per-phone guards (on top of the per-IP `otpLimiter`): a resend cooldown and a
    // rolling-window cap, so a single number can't be SMS-bombed (and SMS cost contained).
    const existing = await Otp.findOne({ phone });
    const inWindow = Boolean(
      existing?.windowStartAt && now - existing.windowStartAt.getTime() < OTP_WINDOW_MS,
    );
    if (inWindow && (existing?.sentCount ?? 0) >= OTP_MAX_PER_WINDOW) {
      throw ApiError.tooManyRequests('Too many codes for this number — try again later');
    }
    const windowStartAt = inWindow && existing?.windowStartAt ? existing.windowStartAt : new Date(now);
    const sentCount = (inWindow ? existing?.sentCount ?? 0 : 0) + 1;

    // Demo/beta (and any non-prod run): fixed 123456, returned so the diner can see it.
    const code = env.demoOtp ? '123456' : String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
    const codeHash = await bcrypt.hash(code, 8);
    const codeExpiresAt = new Date(now + OTP_CODE_TTL_MS);
    await Otp.findOneAndUpdate(
      { phone },
      {
        phone,
        codeHash,
        name,
        attempts: 0,
        codeExpiresAt,
        windowStartAt,
        sentCount,
        // Keep the doc (and its counters) until both the code expiry and the rate window pass.
        expiresAt: new Date(Math.max(codeExpiresAt.getTime(), windowStartAt.getTime() + OTP_WINDOW_MS)),
      },
      { upsert: true },
    );

    // No SMS provider wired — log it, and in demo/beta return it so the flow is testable.
    logger.info(`OTP for ${phone}: ${code}`);
    return ok(res, { sent: true, ...(env.demoOtp ? { devCode: code } : {}) });
  }),
);

router.post(
  '/auth/otp/verify',
  validate(z.object({ phone: phoneSchema, code: z.string().length(6) })),
  asyncHandler(async (req, res) => {
    const { phone, code } = req.body as { phone: string; code: string };
    const otp = await Otp.findOne({ phone });
    if (!otp) throw ApiError.badRequest('Request a new code');
    // The doc outlives the code (it carries rate-limit counters), so check expiry explicitly.
    if (otp.codeExpiresAt && otp.codeExpiresAt.getTime() < Date.now())
      throw ApiError.badRequest('Code expired — request a new code');
    if (otp.attempts >= 5) throw ApiError.badRequest('Too many attempts — request a new code');

    const valid = await bcrypt.compare(code, otp.codeHash);
    if (!valid) {
      await Otp.updateOne({ _id: otp._id }, { $inc: { attempts: 1 } });
      throw ApiError.badRequest('Incorrect code');
    }
    await Otp.deleteOne({ _id: otp._id });

    const token = signCustomerToken(phone, otp.name ?? undefined);
    return ok(res, { token, phone, name: otp.name ?? null });
  }),
);

/** Effective menu for a branch = brand catalog merged with the branch's overrides. */
function loadMenu(branchId: string, brandId?: string | null) {
  return resolveBranchMenu({ brandId, branchId });
}

/**
 * Filter for brand-level resources (loyalty rewards) keyed to a branch's brand.
 * Falls back to the branch id for legacy single-tenant data without a brand.
 */
function rewardScope(restaurant: { _id: unknown; brandId?: unknown }) {
  return restaurant.brandId ? { brandId: restaurant.brandId } : { restaurantId: restaurant._id };
}

/** Attach the brand name so the customer app can show "Brand · Branch". */
async function withBrandName<T extends { brandId?: unknown }>(restaurant: T): Promise<T & { brandName: string | null }> {
  const brand = restaurant.brandId
    ? await Brand.findById(restaurant.brandId as string).select('name').lean()
    : null;
  return { ...restaurant, brandName: brand?.name ?? null };
}

// Public restaurant + full menu by slug.
router.get(
  '/r/:slug',
  asyncHandler(async (req, res) => {
    // Tolerant lookup: trim + lowercase so a stray-case link still resolves.
    const slug = (req.params.slug ?? '').trim().toLowerCase();
    const restaurant = await Restaurant.findOne({ slug }).lean();
    if (!restaurant) throw ApiError.notFound('Restaurant not found');
    if (!restaurant.isLive) throw ApiError.notFound('This restaurant is currently offline');
    await assertSubscriptionActive(String(restaurant._id));
    const menu = await loadMenu(String(restaurant._id), restaurant.brandId ? String(restaurant.brandId) : null);
    return ok(res, { restaurant: await withBrandName(restaurant), ...menu });
  }),
);

// Validate a manually-typed table number (link/direct entry, no QR). Tolerant
// matching: exact name (case/space-insensitive) or the numeric part ("5" ↔ "Table 5").
// Returns the canonical table name, or 404 if the restaurant has tables but none match.
router.get(
  '/r/:slug/table',
  asyncHandler(async (req, res) => {
    const slug = (req.params.slug ?? '').trim().toLowerCase();
    const restaurant = await Restaurant.findOne({ slug, isLive: true }).select('_id').lean();
    if (!restaurant) throw ApiError.notFound('Restaurant not found');
    const raw = String(req.query.name ?? '').trim();
    if (!raw) throw ApiError.badRequest('Enter your table number');

    const tables = await Table.find({ restaurantId: restaurant._id, isActive: true }).select('name').lean();
    if (tables.length === 0) {
      throw ApiError.notFound('This restaurant hasn’t set up tables yet — please scan the QR on your table.');
    }

    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
    const digits = (s: string) => s.match(/\d+/)?.[0] ?? '';
    const q = norm(raw);
    const qd = digits(raw);
    const match = tables.find((t) => norm(t.name) === q || (qd !== '' && digits(t.name) === qd));
    if (!match) throw ApiError.notFound("We couldn't find that table — check the number on your table");
    return ok(res, { name: match.name });
  }),
);

// Resolve a scanned QR token → restaurant + table + menu.
router.get(
  '/qr/:qrToken',
  asyncHandler(async (req, res) => {
    const table = await Table.findOne({ qrToken: req.params.qrToken, isActive: true }).lean();
    if (!table) throw ApiError.notFound('Invalid QR code');
    const restaurant = await Restaurant.findById(table.restaurantId).lean();
    if (!restaurant) throw ApiError.notFound('Restaurant not found');
    if (!restaurant.isLive) throw ApiError.notFound('This restaurant is currently offline');
    await assertSubscriptionActive(String(restaurant._id));
    const menu = await loadMenu(String(restaurant._id), restaurant.brandId ? String(restaurant.brandId) : null);
    // Scanning the table QR self-seats the party — open (or join) a live session.
    await ensureSession(String(restaurant._id), String(table._id), {
      brandId: restaurant.brandId ? String(restaurant.brandId) : null,
      openedBy: 'qr',
    }).catch(() => undefined);
    return ok(res, { restaurant: await withBrandName(restaurant), table, ...menu });
  }),
);

// Place an order as a customer (anonymous-capable).
router.post(
  '/r/:slug/orders',
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    const restaurant = await Restaurant.findOne({ slug: req.params.slug, isLive: true }).lean();
    if (!restaurant) throw ApiError.notFound('Restaurant not found');
    const order = await orders.createOrder({
      restaurantId: String(restaurant._id),
      input: req.body,
    });
    return ok(res, order, 201);
  }),
);

// ─── Checkout + payment ───────────────────────────────────────────────
const checkoutSchema = z.object({
  type: orderTypeSchema,
  tableId: z.string().optional(),
  tableName: z.string().optional(),
  items: z.array(cartItemSchema).default([]), // may be empty for a reward-only order
  notes: z.string().optional(),
  customer: z.object({
    name: z.string().min(2),
    phone: phoneSchema,
  }),
  /** Optional loyalty reward applied to the order (free ₹0 item, points spent). */
  rewardId: z.string().optional(),
  /** How the diner pays: online via Razorpay, or cash at the counter. */
  paymentMethod: z.enum(['razorpay', 'cash']).default('razorpay'),
});

/**
 * Create a pending order (server computes the authoritative total) and, if there's
 * a payable amount, a matching Razorpay order. A ₹0 order (e.g. reward-only) is
 * confirmed immediately. The order is NOT surfaced to the kitchen until paid.
 */
router.post(
  '/r/:slug/checkout',
  optionalCustomerAuth,
  validate(checkoutSchema),
  asyncHandler(async (req, res) => {
    const restaurant = await Restaurant.findOne({ slug: req.params.slug, isLive: true }).lean();
    if (!restaurant) throw ApiError.notFound('Restaurant not found');
    const restaurantId = String(restaurant._id);
    await assertSubscriptionActive(restaurantId);

    const { customer, rewardId, paymentMethod, ...orderInput } = req.body as {
      customer: { name: string; phone: string };
      rewardId?: string;
      paymentMethod: 'razorpay' | 'cash';
      type: 'dine_in' | 'takeaway';
      tableId?: string;
      items: unknown[];
      notes?: string;
    };

    // Validate an applied reward against the signed-in customer's wallet.
    let reward: { rewardId: string; productId: string; pointsCost: number } | undefined;
    if (rewardId) {
      if (!req.customerPhone) throw ApiError.unauthorized('Sign in to use a reward');
      if (!isValidObjectId(rewardId)) throw ApiError.badRequest('Invalid reward');
      const rw = await LoyaltyReward.findOne({ _id: rewardId, ...rewardScope(restaurant), isActive: true }).lean();
      if (!rw) throw ApiError.notFound('Reward not found');
      if (!rw.productId) throw ApiError.badRequest('This reward can’t be added to an order');
      const wallet = await Customer.findOne({ restaurantId, phone: req.customerPhone }).lean();
      if (!wallet || wallet.points < rw.pointsCost) throw ApiError.badRequest('Not enough points');
      reward = { rewardId: String(rw._id), productId: String(rw.productId), pointsCost: rw.pointsCost };
    }

    if (!orderInput.items.length && !reward) throw ApiError.badRequest('Your cart is empty');

    // Reward orders are tied to the verified phone.
    const orderCustomer = reward ? { name: customer.name, phone: req.customerPhone! } : customer;

    const order = await orders.createOrder({
      restaurantId,
      input: orderInput as never,
      customer: orderCustomer,
      reward,
      paymentMethod,
      channel: 'app',
      silent: true,
    });

    // Nothing payable (reward-only / all free) → confirm immediately, no payment.
    if (order.total <= 0) {
      const finalized = await orders.markPaid(String(order._id));
      return ok(res, { order: finalized, razorpay: null, demo: isDemoMode(), free: true }, 201);
    }

    // Pay at counter → confirm now (goes to the kitchen) but leave payment unpaid.
    if (paymentMethod === 'cash') {
      const finalized = await orders.finalizeOrder(String(order._id), { paid: false, method: 'cash' });
      return ok(res, { order: finalized, razorpay: null, demo: isDemoMode(), free: false, cash: true }, 201);
    }

    const razorpay = await createRazorpayOrder(order.total, String(order._id));
    return ok(res, { order, razorpay, demo: isDemoMode(), free: false, cash: false }, 201);
  }),
);

const paySchema = z.object({
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  razorpaySignature: z.string().optional(),
});

/** Confirm payment for an order. Verifies the Razorpay signature (or accepts in demo mode). */
router.post(
  '/orders/:id/pay',
  validate(paySchema),
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid order id');
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const valid = verifyPaymentSignature({
      razorpayOrderId: razorpayOrderId ?? '',
      razorpayPaymentId: razorpayPaymentId ?? '',
      razorpaySignature: razorpaySignature ?? '',
    });
    if (!valid) throw ApiError.badRequest('Payment verification failed');

    const order = await orders.markPaid(req.params.id!, razorpayPaymentId);
    return ok(res, order);
  }),
);

/** Start an online payment for an existing (unpaid) order — used by the ongoing-order pill. */
router.post(
  '/orders/:id/razorpay',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid order id');
    const order = await Order.findById(req.params.id).lean();
    if (!order) throw ApiError.notFound('Order not found');
    if (order.paymentStatus === 'paid') return ok(res, { alreadyPaid: true });
    if (order.total <= 0) {
      const finalized = await orders.markPaid(String(order._id));
      return ok(res, { free: true, order: finalized });
    }
    const razorpay = await createRazorpayOrder(order.total, String(order._id));
    return ok(res, { razorpay, demo: isDemoMode() });
  }),
);

// ─── Diner account: wallet, past orders, rewards, claims ─────────────────
async function findLiveRestaurant(slug: string) {
  const restaurant = await Restaurant.findOne({ slug, isLive: true }).lean();
  if (!restaurant) throw ApiError.notFound('Restaurant not found');
  return restaurant;
}

/**
 * Self-service diner account, keyed by mobile number: loyalty wallet,
 * past orders, the rewards catalog, and previous claims.
 */
router.get(
  '/r/:slug/account',
  optionalCustomerAuth,
  requireCustomer,
  asyncHandler(async (req, res) => {
    const phone = req.customerPhone!; // verified via OTP token
    const restaurant = await findLiveRestaurant(req.params.slug!);
    const restaurantId = restaurant._id;

    const [customer, orders, rewards, redemptions] = await Promise.all([
      Customer.findOne({ restaurantId, phone }).lean(),
      Order.find({ restaurantId, customerPhone: phone }).sort({ placedAt: -1 }).limit(15).lean(),
      LoyaltyReward.find({ ...rewardScope(restaurant), isActive: true }).sort({ pointsCost: 1 }).lean(),
      Redemption.find({ restaurantId, customerPhone: phone }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    return ok(res, { customer, orders, rewards, redemptions });
  }),
);

// ─── Favorites (per diner, per restaurant — requires OTP login) ─────────
/** List the signed-in diner's favorite product ids for this restaurant. */
router.get(
  '/r/:slug/favorites',
  optionalCustomerAuth,
  requireCustomer,
  asyncHandler(async (req, res) => {
    const phone = req.customerPhone!;
    const restaurant = await findLiveRestaurant(req.params.slug!);
    const favorites = await Favorite.find({ restaurantId: restaurant._id, phone }).select('productId').lean();
    return ok(res, { productIds: favorites.map((f) => String(f.productId)) });
  }),
);

const favoriteSchema = z.object({ productId: z.string() });

/** Add a product to favorites (idempotent upsert). */
router.post(
  '/r/:slug/favorites',
  optionalCustomerAuth,
  requireCustomer,
  validate(favoriteSchema),
  asyncHandler(async (req, res) => {
    const phone = req.customerPhone!;
    const { productId } = req.body as { productId: string };
    if (!isValidObjectId(productId)) throw ApiError.badRequest('Invalid product');
    const restaurant = await findLiveRestaurant(req.params.slug!);
    await Favorite.updateOne(
      { restaurantId: restaurant._id, phone, productId },
      { $setOnInsert: { restaurantId: restaurant._id, phone, productId } },
      { upsert: true },
    );
    return ok(res, { favorited: true }, 201);
  }),
);

/** Remove a product from favorites. */
router.delete(
  '/r/:slug/favorites/:productId',
  optionalCustomerAuth,
  requireCustomer,
  asyncHandler(async (req, res) => {
    const phone = req.customerPhone!;
    if (!isValidObjectId(req.params.productId)) throw ApiError.badRequest('Invalid product');
    const restaurant = await findLiveRestaurant(req.params.slug!);
    await Favorite.deleteOne({ restaurantId: restaurant._id, phone, productId: req.params.productId });
    return ok(res, { favorited: false });
  }),
);

const redeemSchema = z.object({
  rewardId: z.string(),
  type: orderTypeSchema.optional(),
  tableId: z.string().optional(),
});

/**
 * Claim a reward. If the reward is linked to a menu item, it's placed as a real
 * ₹0 order through the normal pipeline (kitchen/admin/tracking). Otherwise a
 * claim code is issued for staff to fulfil manually. Points are deducted
 * atomically either way. Requires OTP login.
 */
router.post(
  '/r/:slug/redeem',
  optionalCustomerAuth,
  requireCustomer,
  validate(redeemSchema),
  asyncHandler(async (req, res) => {
    const phone = req.customerPhone!; // verified via OTP token — can't drain someone else's points
    const { rewardId, type, tableId } = req.body as {
      rewardId: string;
      type?: 'dine_in' | 'takeaway';
      tableId?: string;
    };
    if (!isValidObjectId(rewardId)) throw ApiError.badRequest('Invalid reward');
    const restaurant = await findLiveRestaurant(req.params.slug!);
    const restaurantId = restaurant._id;

    const reward = await LoyaltyReward.findOne({ _id: rewardId, ...rewardScope(restaurant), isActive: true }).lean();
    if (!reward) throw ApiError.notFound('Reward not found');

    // Atomic conditional deduction — prevents double-spends and negative wallets.
    const customer = await Customer.findOneAndUpdate(
      { restaurantId, phone, points: { $gte: reward.pointsCost } },
      { $inc: { points: -reward.pointsCost } },
      { new: true },
    );
    if (!customer) throw ApiError.badRequest('Not enough points for this reward');

    try {
      // Linked item → place a free order that flows to the kitchen and can be tracked.
      if (reward.productId) {
        const order = await orders.createRewardOrder({
          restaurantId: String(restaurantId),
          rewardId: String(reward._id),
          rewardTitle: reward.title,
          productId: String(reward.productId),
          customer: { name: customer.name ?? undefined, phone },
          type: type ?? 'dine_in',
          tableId: tableId && isValidObjectId(tableId) ? tableId : undefined,
        });
        const redemption = await Redemption.create({
          restaurantId,
          customerPhone: phone,
          customerName: customer.name,
          rewardId: reward._id,
          rewardTitle: reward.title,
          pointsCost: reward.pointsCost,
          code: randomToken(3).toUpperCase(),
          status: 'fulfilled', // fulfilment now happens through the order itself
        });
        return ok(res, { order, redemption: redemption.toObject(), points: customer.points }, 201);
      }

      // No linked item → fall back to a claim code for manual fulfilment.
      const redemption = await Redemption.create({
        restaurantId,
        customerPhone: phone,
        customerName: customer.name,
        rewardId: reward._id,
        rewardTitle: reward.title,
        pointsCost: reward.pointsCost,
        code: randomToken(3).toUpperCase(),
        status: 'pending',
      });
      return ok(res, { redemption: redemption.toObject(), points: customer.points }, 201);
    } catch (err) {
      // Refund points if order placement failed, so the diner isn't charged for nothing.
      await Customer.updateOne({ restaurantId, phone }, { $inc: { points: reward.pointsCost } });
      throw err;
    }
  }),
);

// Track a single order (used by the customer's live tracking page).
router.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid order id');
    const order = await Order.findById(req.params.id).lean();
    if (!order) throw ApiError.notFound('Order not found');
    // Attach lightweight restaurant info so the customer can render a self-contained invoice.
    const restaurant = await Restaurant.findById(order.restaurantId)
      .select('name slug currency tax address contactNumber')
      .lean();
    return ok(res, {
      ...order,
      restaurant: restaurant
        ? {
            name: restaurant.name,
            currency: restaurant.currency,
            gstNumber: restaurant.tax?.gstNumber,
            cgstPercent: restaurant.tax?.cgstPercent,
            sgstPercent: restaurant.tax?.sgstPercent,
            contactNumber: restaurant.contactNumber,
            address: restaurant.address,
          }
        : null,
    });
  }),
);

// ─── Capture a sales / demo lead from the marketing site ───────────────────
router.post(
  '/leads',
  validate(createLeadSchema),
  asyncHandler(async (req, res) => {
    const lead = await Lead.create(req.body);
    logger.info(`New ${lead.type} lead from ${lead.email}`);
    return ok(res, { received: true, id: String(lead._id) }, 201);
  }),
);

export default router;
