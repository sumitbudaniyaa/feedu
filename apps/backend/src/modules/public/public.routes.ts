import { Router } from 'express';
import { z } from 'zod';
import { cartItemSchema, createOrderSchema, orderTypeSchema, phoneSchema } from '@feedo/types';
import { Category, Order, Product, Restaurant, Section, Table } from '../../models/index.js';
import { isValidObjectId } from 'mongoose';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok } from '../../utils/http.js';
import * as orders from '../orders/orders.service.js';
import { createRazorpayOrder, isDemoMode, verifyPaymentSignature } from '../payments/payments.service.js';

const router = Router();

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
    const restaurant = await Restaurant.findOne({ slug: req.params.slug, isLive: true }).lean();
    if (!restaurant) throw ApiError.notFound('Restaurant not found');
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
  items: z.array(cartItemSchema).min(1),
  notes: z.string().optional(),
  customer: z.object({
    name: z.string().min(2),
    phone: phoneSchema,
  }),
});

/**
 * Create a pending order (server computes the authoritative total) and, if
 * Razorpay is configured, a matching Razorpay order. The order is NOT surfaced
 * to the kitchen until payment is confirmed.
 */
router.post(
  '/r/:slug/checkout',
  validate(checkoutSchema),
  asyncHandler(async (req, res) => {
    const restaurant = await Restaurant.findOne({ slug: req.params.slug, isLive: true }).lean();
    if (!restaurant) throw ApiError.notFound('Restaurant not found');

    const { customer, ...orderInput } = req.body;
    const order = await orders.createOrder({
      restaurantId: String(restaurant._id),
      input: orderInput,
      customer,
      paymentMethod: 'razorpay',
      silent: true,
    });

    const razorpay = await createRazorpayOrder(order.total, String(order._id));
    return ok(res, { order, razorpay, demo: isDemoMode() }, 201);
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

// Track a single order (used by the customer's live tracking page).
router.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid order id');
    const order = await Order.findById(req.params.id).lean();
    if (!order) throw ApiError.notFound('Order not found');
    return ok(res, order);
  }),
);

export default router;
