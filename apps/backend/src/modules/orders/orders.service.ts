import type { CreateOrderInput, OrderStatus } from '@feedo/types';
import { rooms, SOCKET_EVENTS } from '@feedo/types';
import { computeTotals } from '@feedo/utils';
import mongoose from 'mongoose';
import {
  Customer,
  CustomerLoyalty,
  LoyaltyProgram,
  Order,
  Payment,
  Product,
  Restaurant,
} from '../../models/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { getIO } from '../../sockets/index.js';
import { logger } from '../../utils/logger.js';

/** Valid forward transitions for an order's status. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  // Kitchen can start a fresh order directly; confirmed is optional.
  pending: ['confirmed', 'preparing', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served', 'completed'],
  served: ['completed'],
  completed: ['refunded'],
  cancelled: [],
  refunded: [],
};

async function nextOrderNumber(restaurantId: string): Promise<string> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const count = await Order.countDocuments({
    restaurantId,
    createdAt: { $gte: start },
  });
  const seq = String(count + 1).padStart(3, '0');
  const datePart = start.toISOString().slice(2, 10).replace(/-/g, '');
  return `${datePart}-${seq}`;
}

interface CreateContext {
  restaurantId: string;
  customerId?: string | null;
  input: CreateOrderInput;
  /** Guest contact captured at checkout. */
  customer?: { name?: string; phone?: string };
  paymentMethod?: 'cash' | 'card' | 'upi' | 'razorpay' | 'stripe';
  /** Suppress the create emit (used for pay-first flows; emit happens on markPaid). */
  silent?: boolean;
}

/**
 * Create an order from a validated cart. Server is authoritative for pricing:
 * prices are re-derived from the DB, never trusted from the client.
 */
export async function createOrder({
  restaurantId,
  customerId,
  input,
  customer,
  paymentMethod,
  silent,
}: CreateContext) {
  const restaurant = await Restaurant.findById(restaurantId).lean();
  if (!restaurant) throw ApiError.notFound('Restaurant not found');

  const productIds = input.items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds }, restaurantId }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const items = input.items.map((cartItem) => {
    const product = byId.get(cartItem.productId);
    if (!product) throw ApiError.badRequest(`Product ${cartItem.productId} unavailable`);
    if (!product.isAvailable) throw ApiError.badRequest(`${product.name} is unavailable`);

    // Resolve unit price from variant (if any) or base price.
    let unitPrice = product.basePrice;
    if (cartItem.variantLabel) {
      const variant = product.variants.find((v) => v.label === cartItem.variantLabel);
      if (!variant) throw ApiError.badRequest(`Invalid variant for ${product.name}`);
      unitPrice = variant.price;
    }

    // Add selected add-ons.
    const addons = (cartItem.addonLabels ?? []).map((label) => {
      const addon = product.addons.find((a) => a.label === label);
      if (!addon) throw ApiError.badRequest(`Invalid add-on for ${product.name}`);
      return { label: addon.label, price: addon.price };
    });
    unitPrice += addons.reduce((s, a) => s + a.price, 0);

    // Stock check (only when tracked).
    if (product.stock != null && product.stock < cartItem.quantity) {
      throw ApiError.badRequest(`${product.name} is out of stock`);
    }

    return {
      productId: product._id,
      name: product.name,
      isVeg: product.isVeg,
      prepTimeMinutes: product.prepTimeMinutes,
      variantLabel: cartItem.variantLabel,
      addons,
      unitPrice,
      quantity: cartItem.quantity,
      notes: cartItem.notes,
      lineTotal: unitPrice * cartItem.quantity,
    };
  });

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const totals = computeTotals({
    subtotal,
    gstPercent: restaurant.tax?.gstPercent ?? 5,
    inclusive: restaurant.tax?.inclusive ?? false,
  });

  // Per-item loyalty points (admin sets points per product). Credited on payment.
  const earnablePoints = input.items.reduce((sum, cartItem) => {
    const product = byId.get(cartItem.productId);
    return sum + (product?.loyaltyPoints ?? 0) * cartItem.quantity;
  }, 0);

  // Persist order (retry once on duplicate order number race).
  let order;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      order = await Order.create({
        restaurantId,
        orderNumber: await nextOrderNumber(restaurantId),
        tableId: input.tableId ?? null,
        customerId: customerId ?? null,
        customerName: customer?.name,
        customerPhone: customer?.phone,
        type: input.type,
        status: 'pending',
        items,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discount,
        total: totals.total,
        loyaltyPointsEarned: earnablePoints,
        notes: input.notes,
        paymentStatus: 'unpaid',
        paymentMethod,
      });
      break;
    } catch (err) {
      if (attempt === 1) throw err;
    }
  }
  if (!order) throw ApiError.internal('Could not create order');

  // Increment soldCount for every item; decrement stock only for tracked ones.
  await Promise.all(
    items.map((i) => {
      const tracked = byId.get(String(i.productId))?.stock != null;
      return Product.updateOne(
        { _id: i.productId, restaurantId },
        tracked
          ? { $inc: { stock: -i.quantity, soldCount: i.quantity } }
          : { $inc: { soldCount: i.quantity } },
      );
    }),
  );

  // Loyalty accrual (points programs).
  if (customerId) {
    await accrueLoyalty(restaurantId, customerId, totals.total).catch((e) =>
      logger.warn('Loyalty accrual failed', e),
    );
  }

  if (!silent) emit(SOCKET_EVENTS.ORDER_CREATED, restaurantId, order.toObject());
  return order.toObject();
}

async function accrueLoyalty(restaurantId: string, customerId: string, total: number) {
  const program = await LoyaltyProgram.findOne({
    restaurantId,
    type: 'points',
    isActive: true,
  }).lean();
  const points = program?.conditions?.pointsPerCurrency
    ? Math.floor(total * program.conditions.pointsPerCurrency)
    : 0;

  await CustomerLoyalty.updateOne(
    { restaurantId, customerId },
    {
      $inc: { points, totalOrders: 1, totalSpent: total },
      $setOnInsert: { restaurantId, customerId },
    },
    { upsert: true },
  );
}

export async function updateStatus(restaurantId: string, orderId: string, status: OrderStatus) {
  const order = await Order.findOne({ _id: orderId, restaurantId });
  if (!order) throw ApiError.notFound('Order not found');

  const allowed = TRANSITIONS[order.status as OrderStatus];
  if (order.status !== status && !allowed.includes(status)) {
    throw ApiError.badRequest(`Cannot move order from ${order.status} to ${status}`);
  }

  order.status = status;
  if (status === 'ready') order.readyAt = new Date();
  if (status === 'completed' || status === 'served') order.completedAt ??= new Date();
  await order.save();

  const obj = order.toObject();
  emit(SOCKET_EVENTS.ORDER_UPDATED, restaurantId, obj);
  getIO()
    .to(rooms.order(orderId))
    .emit(SOCKET_EVENTS.ORDER_STATUS_CHANGED, { orderId, status });
  return obj;
}

function emit(event: string, restaurantId: string, payload: unknown) {
  try {
    // Loosely typed emitter — payloads are validated by the typed client side.
    const io = getIO() as unknown as {
      to: (room: string) => { emit: (event: string, payload?: unknown) => void };
    };
    io.to(rooms.restaurant(restaurantId)).emit(event, payload);
    io.to(rooms.kitchen(restaurantId)).emit(event, payload);
    io.to(rooms.restaurant(restaurantId)).emit(SOCKET_EVENTS.DASHBOARD_REFRESH);
  } catch {
    // Socket layer not ready (e.g. during tests) — non-fatal.
  }
}

export async function listOrders(
  restaurantId: string,
  opts: { status?: string; page?: number; limit?: number; active?: boolean },
) {
  const filter: mongoose.RootFilterQuery<typeof Order> = { restaurantId };
  if (opts.status) (filter as Record<string, unknown>).status = opts.status;
  if (opts.active) {
    (filter as Record<string, unknown>).status = {
      $in: ['pending', 'confirmed', 'preparing', 'ready'],
    };
  }
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));

  const [items, total] = await Promise.all([
    Order.find(filter).sort({ placedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function getOrder(restaurantId: string, orderId: string) {
  const order = await Order.findOne({ _id: orderId, restaurantId }).lean();
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

/** Mark an order paid and auto-confirm it (used after a verified payment). */
export async function markPaid(orderId: string, providerRef?: string) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  order.paymentStatus = 'paid';
  if (order.status === 'pending') order.status = 'confirmed';

  // Accrue loyalty + customer tracking now that payment succeeded.
  const restaurantId = String(order.restaurantId);
  if (order.customerPhone) {
    const earned = await accrueCustomer(restaurantId, {
      phone: order.customerPhone,
      name: order.customerName ?? undefined,
      total: order.total,
      // Per-item points (set at order creation) win; fall back to the points program.
      points: order.loyaltyPointsEarned > 0 ? order.loyaltyPointsEarned : undefined,
    });
    order.loyaltyPointsEarned = earned;
  }
  await order.save();

  const obj = order.toObject();
  emit(SOCKET_EVENTS.ORDER_CREATED, restaurantId, obj); // surface to kitchen/admin once paid
  if (providerRef) {
    await Payment.create({
      restaurantId,
      orderId: order._id,
      amount: order.total,
      method: 'razorpay',
      status: 'paid',
      providerRef,
    }).catch(() => undefined);
  }
  return obj;
}

/** Upsert a guest customer (by phone) and award loyalty points. Returns points earned. */
async function accrueCustomer(
  restaurantId: string,
  { phone, name, total, points }: { phone: string; name?: string; total: number; points?: number },
): Promise<number> {
  let earned = points ?? 0;
  if (points === undefined) {
    const program = await LoyaltyProgram.findOne({
      restaurantId,
      type: 'points',
      isActive: true,
    }).lean();
    earned = program?.conditions?.pointsPerCurrency
      ? Math.floor(total * program.conditions.pointsPerCurrency)
      : 0;
  }

  await Customer.updateOne(
    { restaurantId, phone },
    {
      $set: { lastOrderAt: new Date(), ...(name ? { name } : {}) },
      $inc: { totalOrders: 1, totalSpent: total, points: earned },
      $setOnInsert: { restaurantId, phone },
    },
    { upsert: true },
  );
  return earned;
}
