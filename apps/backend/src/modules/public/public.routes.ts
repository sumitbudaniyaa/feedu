import { Router } from 'express';
import { createOrderSchema } from '@feedo/types';
import { Category, Order, Product, Restaurant, Section, Table } from '../../models/index.js';
import { isValidObjectId } from 'mongoose';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok } from '../../utils/http.js';
import * as orders from '../orders/orders.service.js';

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
