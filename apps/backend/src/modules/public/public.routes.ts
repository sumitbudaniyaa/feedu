import { Router } from 'express';
import { z } from 'zod';
import { cartItemSchema, createOrderSchema, orderTypeSchema, phoneSchema, SOCKET_EVENTS, rooms } from '@feedo/types';
import bcrypt from 'bcryptjs';
import {
  Category,
  Customer,
  LoyaltyReward,
  Order,
  Otp,
  Product,
  Redemption,
  Restaurant,
  Section,
  Table,
} from '../../models/index.js';
import { isValidObjectId } from 'mongoose';
import { randomToken } from '@feedo/utils';
import { validate } from '../../middleware/validate.js';
import { optionalCustomerAuth, requireCustomer } from '../../middleware/customer.js';
import { otpLimiter } from '../../middleware/security.js';
import { ApiError } from '../../utils/ApiError.js';
import { signCustomerToken } from '../../utils/jwt.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';
import * as orders from '../orders/orders.service.js';
import { createRazorpayOrder, isDemoMode, verifyPaymentSignature } from '../payments/payments.service.js';
import { getIO } from '../../sockets/index.js';

const router = Router();

// ─── Call a waiter to a table ──────────────────────────────────────────────
router.post(
  '/r/:slug/call-waiter',
  validate(z.object({ tableName: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const restaurant = await Restaurant.findOne({ slug: req.params.slug }).select('_id').lean();
    if (!restaurant) throw ApiError.notFound('Restaurant not found');
    const { tableName } = req.body as { tableName: string };
    const io = getIO() as unknown as {
      to: (room: string) => { emit: (event: string, payload: unknown) => void };
    };
    io.to(rooms.restaurant(String(restaurant._id))).emit(SOCKET_EVENTS.WAITER_CALLED, {
      tableName,
      at: new Date().toISOString(),
    });
    return ok(res, { called: true });
  }),
);

// ─── Customer OTP login ──────────────────────────────────────────────────
router.post(
  '/auth/otp/request',
  otpLimiter,
  validate(z.object({ phone: phoneSchema, name: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const { phone, name } = req.body as { phone: string; name?: string };
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
    const codeHash = await bcrypt.hash(code, 8);
    await Otp.findOneAndUpdate(
      { phone },
      { phone, codeHash, name, attempts: 0, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
      { upsert: true },
    );

    // No SMS provider wired — log it, and in non-prod return it so the flow is testable.
    logger.info(`OTP for ${phone}: ${code}`);
    return ok(res, { sent: true, ...(env.isProd ? {} : { devCode: code }) });
  }),
);

router.post(
  '/auth/otp/verify',
  validate(z.object({ phone: phoneSchema, code: z.string().length(6) })),
  asyncHandler(async (req, res) => {
    const { phone, code } = req.body as { phone: string; code: string };
    const otp = await Otp.findOne({ phone });
    if (!otp) throw ApiError.badRequest('Request a new code');
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

async function loadMenu(restaurantId: string) {
  const [categories, products, sections] = await Promise.all([
    Category.find({ restaurantId, isActive: true }).sort({ order: 1 }).lean(),
    Product.find({ restaurantId, isAvailable: true }).sort({ createdAt: -1 }).lean(),
    Section.find({ restaurantId, isActive: true }).sort({ order: 1 }).lean(),
  ]);
  return { categories, products, sections };
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
    const menu = await loadMenu(String(restaurant._id));
    return ok(res, { restaurant, ...menu });
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
    const menu = await loadMenu(String(restaurant._id));
    return ok(res, { restaurant, table, ...menu });
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
      const rw = await LoyaltyReward.findOne({ _id: rewardId, restaurantId, isActive: true }).lean();
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
      LoyaltyReward.find({ restaurantId, isActive: true }).sort({ pointsCost: 1 }).lean(),
      Redemption.find({ restaurantId, customerPhone: phone }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    return ok(res, { customer, orders, rewards, redemptions });
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

    const reward = await LoyaltyReward.findOne({ _id: rewardId, restaurantId, isActive: true }).lean();
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
            gstPercent: restaurant.tax?.gstPercent,
            contactNumber: restaurant.contactNumber,
            address: restaurant.address,
          }
        : null,
    });
  }),
);

export default router;
