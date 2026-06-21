import type { CreateOrderInput, OrderStatus } from '@feedo/types';
import { rooms, SOCKET_EVENTS } from '@feedo/types';
import { computeTotals } from '@feedo/utils';
import {
  BranchMenu,
  Customer,
  CustomerLoyalty,
  LoyaltyProgram,
  Order,
  Payment,
  Product,
  Restaurant,
  Table,
} from '../../models/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { getIO } from '../../sockets/index.js';
import { logger } from '../../utils/logger.js';
import { resolveOrderProducts } from '../menu/menu.service.js';

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
  /** Mark the order confirmed immediately (staff-placed counter orders). */
  autoConfirm?: boolean;
  /** A loyalty reward applied to this order — added as a ₹0 line; points deducted on payment. */
  reward?: { rewardId: string; productId: string; pointsCost: number };
  /** Sales channel (own app, counter, or an aggregator). */
  channel?: 'app' | 'counter' | 'zomato' | 'swiggy' | 'district';
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
  autoConfirm,
  reward,
  channel,
}: CreateContext) {
  const restaurant = await Restaurant.findById(restaurantId).lean();
  if (!restaurant) throw ApiError.notFound('Restaurant not found');
  const brandId = restaurant.brandId ? String(restaurant.brandId) : null;

  const productIds = input.items.map((i) => i.productId);
  // Resolve against the brand catalog with this branch's price/stock/availability.
  const byId = await resolveOrderProducts({ brandId, branchId: restaurantId }, productIds);

  const items = input.items.map((cartItem) => {
    const eff = byId.get(cartItem.productId);
    if (!eff) throw ApiError.badRequest(`Product ${cartItem.productId} unavailable`);
    const { product } = eff;
    if (!eff.isAvailable) throw ApiError.badRequest(`${product.name} is unavailable`);

    // Resolve unit price from variant (if any) or the branch's effective base price.
    let unitPrice = eff.basePrice;
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

    // Stock check against this branch's effective stock (only when tracked).
    if (eff.stock != null && eff.stock < cartItem.quantity) {
      throw ApiError.badRequest(`${product.name} is out of stock`);
    }

    return {
      productId: product._id,
      categoryId: product.categoryId,
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

  // A claimed reward rides along as a ₹0 line (doesn't affect the payable total).
  if (reward) {
    const rp = await Product.findOne(
      brandId ? { _id: reward.productId, brandId } : { _id: reward.productId, restaurantId },
    ).lean();
    if (!rp) throw ApiError.badRequest('Reward item is unavailable');
    items.push({
      productId: rp._id,
      categoryId: rp.categoryId,
      name: rp.name,
      isVeg: rp.isVeg,
      prepTimeMinutes: rp.prepTimeMinutes,
      variantLabel: undefined,
      addons: [],
      unitPrice: 0,
      quantity: 1,
      notes: '🎁 Reward',
      lineTotal: 0,
    });
  }

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const totals = computeTotals({
    subtotal,
    cgstPercent: restaurant.tax?.cgstPercent ?? 2.5,
    sgstPercent: restaurant.tax?.sgstPercent ?? 2.5,
    inclusive: restaurant.tax?.inclusive ?? false,
  });

  // Per-item loyalty points (admin sets points per product). Credited on payment.
  const earnablePoints = input.items.reduce((sum, cartItem) => {
    const product = byId.get(cartItem.productId)?.product;
    return sum + (product?.loyaltyPoints ?? 0) * cartItem.quantity;
  }, 0);

  // Snapshot the table name for invoices / KDS. A scanned QR resolves the real
  // table; a diner ordering via the link can type their table number manually.
  let tableName: string | undefined = input.tableName?.trim() || undefined;
  if (input.tableId) {
    const table = await Table.findOne({ _id: input.tableId, restaurantId }).select('name').lean();
    tableName = table?.name ?? tableName;
  }

  // Persist order (retry once on duplicate order number race).
  let order;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      order = await Order.create({
        restaurantId,
        brandId: restaurant.brandId ?? undefined,
        orderNumber: await nextOrderNumber(restaurantId),
        tableId: input.tableId ?? null,
        tableName,
        customerId: customerId ?? null,
        customerName: customer?.name,
        customerPhone: customer?.phone,
        type: input.type,
        channel: channel ?? 'app',
        status: autoConfirm ? 'confirmed' : 'pending',
        items,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discount,
        total: totals.total,
        loyaltyPointsEarned: earnablePoints,
        loyaltyRewardApplied: reward?.rewardId ?? null,
        rewardPointsSpent: reward?.pointsCost ?? 0,
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

  // Increment soldCount (brand-level) for every item; decrement stock only for
  // tracked ones. Branch-level stock lives in BranchMenu when the branch has an
  // override row that tracks it; otherwise fall back to the product's own stock
  // (home-branch + legacy single-tenant behaviour).
  await Promise.all(
    items.map((i) => {
      const eff = byId.get(String(i.productId));
      const tracked = eff?.stock != null;
      if (tracked && eff?.override && eff.override.stock != null) {
        return Promise.all([
          BranchMenu.updateOne(
            { branchId: restaurantId, productId: i.productId },
            { $inc: { stock: -i.quantity } },
          ),
          Product.updateOne({ _id: i.productId }, { $inc: { soldCount: i.quantity } }),
        ]);
      }
      return Product.updateOne(
        { _id: i.productId },
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

  // Serving an order completes it — there's no separate "complete" step.
  const finalStatus: OrderStatus = status === 'served' ? 'completed' : status;

  order.status = finalStatus;
  if (finalStatus === 'ready') order.readyAt = new Date();
  if (finalStatus === 'completed') order.completedAt ??= new Date();
  await order.save();

  const obj = order.toObject();
  emit(SOCKET_EVENTS.ORDER_UPDATED, restaurantId, obj);
  getIO()
    .to(rooms.order(orderId))
    .emit(SOCKET_EVENTS.ORDER_STATUS_CHANGED, { orderId, status: finalStatus });
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

    // Fan out to the brand room so brand-wide dashboards see every branch live.
    const brandId = (payload as { brandId?: unknown } | null)?.brandId;
    if (brandId) {
      io.to(rooms.brand(String(brandId))).emit(event, payload);
      io.to(rooms.brand(String(brandId))).emit(SOCKET_EVENTS.DASHBOARD_REFRESH);
    }
  } catch {
    // Socket layer not ready (e.g. during tests) — non-fatal.
  }
}

export async function listOrders(
  restaurantId: string,
  opts: { status?: string; page?: number; limit?: number; active?: boolean },
) {
  const filter = { restaurantId } as Record<string, unknown>;
  if (opts.status) filter.status = opts.status;
  if (opts.active) {
    filter.status = { $in: ['pending', 'confirmed', 'preparing', 'ready'] };
  }
  // Hide orders that are still awaiting online payment (created at checkout,
  // not yet paid) — they should never reach staff until payment confirms.
  filter.$nor = [{ status: 'pending', paymentStatus: 'unpaid' }];
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));

  const [items, total] = await Promise.all([
    Order.find(filter as never).sort({ placedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter as never),
  ]);
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function getOrder(restaurantId: string, orderId: string) {
  const order = await Order.findOne({ _id: orderId, restaurantId }).lean();
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

interface RewardOrderContext {
  restaurantId: string;
  rewardId: string;
  rewardTitle: string;
  productId: string;
  customer: { name?: string; phone: string };
  type: 'dine_in' | 'takeaway';
  tableId?: string;
}

/**
 * Place a free (₹0) order for a claimed reward's product. Flows through the
 * normal order pipeline (confirmed + paid) so it reaches the kitchen/admin and
 * the diner can track it like any order.
 */
export async function createRewardOrder(ctx: RewardOrderContext) {
  const branch = await Restaurant.findById(ctx.restaurantId).select('brandId').lean();
  const brandId = branch?.brandId ? String(branch.brandId) : null;
  const eff = (
    await resolveOrderProducts({ brandId, branchId: ctx.restaurantId }, [ctx.productId])
  ).get(ctx.productId);
  if (!eff) throw ApiError.badRequest('Reward item is unavailable');
  const { product } = eff;

  let tableName: string | undefined;
  if (ctx.tableId) {
    const table = await Table.findOne({ _id: ctx.tableId, restaurantId: ctx.restaurantId })
      .select('name')
      .lean();
    tableName = table?.name;
  }

  const item = {
    productId: product._id,
    categoryId: product.categoryId,
    name: product.name,
    isVeg: product.isVeg,
    prepTimeMinutes: product.prepTimeMinutes,
    addons: [],
    unitPrice: 0,
    quantity: 1,
    notes: `🎁 Reward: ${ctx.rewardTitle}`,
    lineTotal: 0,
  };

  let order;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      order = await Order.create({
        restaurantId: ctx.restaurantId,
        brandId: product.brandId ?? undefined,
        orderNumber: await nextOrderNumber(ctx.restaurantId),
        tableId: ctx.tableId ?? null,
        tableName,
        customerName: ctx.customer.name,
        customerPhone: ctx.customer.phone,
        type: ctx.type,
        status: 'confirmed',
        items: [item],
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        total: 0,
        isReward: true,
        loyaltyRewardApplied: ctx.rewardId,
        paymentStatus: 'paid',
        paymentMethod: 'reward',
      });
      break;
    } catch (err) {
      if (attempt === 1) throw err;
    }
  }
  if (!order) throw ApiError.internal('Could not place reward order');

  // Decrement this branch's effective stock if tracked (BranchMenu override when
  // present, else the product's own stock — home-branch + legacy behaviour).
  if (eff.stock != null) {
    if (eff.override && eff.override.stock != null) {
      await Promise.all([
        BranchMenu.updateOne(
          { branchId: ctx.restaurantId, productId: product._id },
          { $inc: { stock: -1 } },
        ),
        Product.updateOne({ _id: product._id }, { $inc: { soldCount: 1 } }),
      ]);
    } else {
      await Product.updateOne({ _id: product._id }, { $inc: { stock: -1, soldCount: 1 } });
    }
  }

  emit(SOCKET_EVENTS.ORDER_CREATED, ctx.restaurantId, order.toObject());
  return order.toObject();
}

/**
 * Confirm an order and run loyalty side-effects (accrual + reward spend) once.
 * `paid` marks payment captured (online); a cash order is confirmed but left unpaid
 * until staff collect it. Either way the order is surfaced to the kitchen/admin.
 */
export async function finalizeOrder(
  orderId: string,
  opts: { paid: boolean; method?: 'razorpay' | 'cash'; providerRef?: string },
) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (opts.paid) order.paymentStatus = 'paid';
  if (order.status === 'pending') order.status = 'confirmed';

  const restaurantId = String(order.restaurantId);
  if (order.customerPhone) {
    const earned = await accrueCustomer(restaurantId, {
      phone: order.customerPhone,
      name: order.customerName ?? undefined,
      total: order.total,
      points: order.loyaltyPointsEarned > 0 ? order.loyaltyPointsEarned : undefined,
    });
    order.loyaltyPointsEarned = earned;

    // Spend points for a reward applied to this order (once, when it's committed).
    if (order.loyaltyRewardApplied && order.rewardPointsSpent > 0 && !order.rewardDeducted) {
      await Customer.updateOne(
        { restaurantId, phone: order.customerPhone, points: { $gte: order.rewardPointsSpent } },
        { $inc: { points: -order.rewardPointsSpent } },
      );
      order.rewardDeducted = true;
    }
  }
  await order.save();

  const obj = order.toObject();
  emit(SOCKET_EVENTS.ORDER_CREATED, restaurantId, obj); // surface to kitchen/admin
  if (opts.paid && opts.providerRef) {
    await Payment.create({
      restaurantId,
      orderId: order._id,
      amount: order.total,
      method: opts.method ?? 'razorpay',
      status: 'paid',
      providerRef: opts.providerRef,
    }).catch(() => undefined);
  }
  return obj;
}

/** Mark an order paid + confirmed (used after a verified online payment). */
export function markPaid(orderId: string, providerRef?: string) {
  return finalizeOrder(orderId, { paid: true, method: 'razorpay', providerRef });
}

/** Record a manual payment for an order (admin marks it paid, picking the method). */
type ManualMethod = 'cash' | 'upi' | 'card' | 'zomato' | 'swiggy' | 'district';

export async function recordPayment(
  restaurantId: string,
  orderId: string,
  input: { method?: ManualMethod; splits?: { method: ManualMethod; amount: number }[] },
) {
  const order = await Order.findOne({ _id: orderId, restaurantId });
  if (!order) throw ApiError.notFound('Order not found');

  // Normalize to a list of {method, amount}. A single method covers the whole total.
  const splits =
    input.splits && input.splits.length
      ? input.splits.map((s) => ({ method: s.method, amount: Math.round(Number(s.amount)) }))
      : input.method
        ? [{ method: input.method, amount: order.total }]
        : null;
  if (!splits || splits.length === 0) throw ApiError.badRequest('Provide a payment method or splits');
  if (splits.some((s) => !(s.amount > 0))) throw ApiError.badRequest('Each split needs a positive amount');

  // A true split must add up to the order total (₹1 rounding tolerance).
  if (input.splits && input.splits.length > 1) {
    const sum = splits.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(sum - order.total) > 1) {
      throw ApiError.badRequest(`Split total ₹${sum} must equal the order total ₹${order.total}`);
    }
  }

  order.paymentStatus = 'paid';
  order.paymentMethod = splits.length > 1 ? 'split' : splits[0]!.method;
  order.set('paymentSplits', splits.length > 1 ? splits : []);
  await order.save();

  await Promise.all(
    splits.map((s) =>
      Payment.create({ restaurantId, orderId: order._id, amount: s.amount, method: s.method, status: 'paid' }).catch(
        () => undefined,
      ),
    ),
  );

  const obj = order.toObject();
  emit(SOCKET_EVENTS.ORDER_UPDATED, restaurantId, obj);
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
