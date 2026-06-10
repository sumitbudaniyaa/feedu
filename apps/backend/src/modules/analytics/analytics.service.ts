import type { DashboardStats } from '@feedo/types';
import { Types } from 'mongoose';
import { Order, Product } from '../../models/index.js';

const REVENUE_STATUSES = ['confirmed', 'preparing', 'ready', 'served', 'completed'];

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function pct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Number((((curr - prev) / prev) * 100).toFixed(1));
}

/** Compute the admin dashboard stats from real order data. */
export async function getDashboardStats(
  restaurantId: string,
  range: 'day' | 'week' | 'month' = 'week',
): Promise<DashboardStats> {
  const today = startOfDay();
  const yesterday = new Date(today.getTime() - 86400000);
  const rangeDays = range === 'day' ? 1 : range === 'week' ? 7 : 30;
  const rangeStart = new Date(today.getTime() - (rangeDays - 1) * 86400000);

  // Aggregation pipelines do NOT auto-cast — restaurantId must be a real ObjectId.
  const rid = new Types.ObjectId(restaurantId);
  const matchPaid = { restaurantId: rid, status: { $in: REVENUE_STATUSES } } as Record<string, unknown>;

  const [todayAgg, yestAgg, series, topProducts, peakHours, lowStock, allTimeCustomers] =
    await Promise.all([
      Order.aggregate([
        { $match: { ...matchPaid, placedAt: { $gte: today } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { ...matchPaid, placedAt: { $gte: yesterday, $lt: today } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { ...matchPaid, placedAt: { $gte: rangeStart } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$placedAt' } },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { ...matchPaid, placedAt: { $gte: rangeStart } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            name: { $first: '$items.name' },
            sold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.lineTotal' },
          },
        },
        { $sort: { sold: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([
        { $match: { ...matchPaid, placedAt: { $gte: rangeStart } } },
        { $group: { _id: { $hour: '$placedAt' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Product.find({
        restaurantId,
        stock: { $ne: null },
        $expr: { $lte: ['$stock', '$lowStockThreshold'] },
      })
        .select('name stock')
        .limit(10)
        .lean(),
      Order.aggregate([
        { $match: { ...matchPaid, customerId: { $ne: null } } },
        { $group: { _id: '$customerId', orders: { $sum: 1 } } },
      ]),
    ]);

  const repeat = allTimeCustomers.filter((c) => c.orders > 1).length;
  const totalCustomers = allTimeCustomers.length;
  const todayRevenue = todayAgg[0]?.revenue ?? 0;
  const todayOrders = todayAgg[0]?.orders ?? 0;

  return {
    revenueToday: todayRevenue,
    revenueChangePct: pct(todayRevenue, yestAgg[0]?.revenue ?? 0),
    ordersToday: todayOrders,
    ordersChangePct: pct(todayOrders, yestAgg[0]?.orders ?? 0),
    avgOrderValue: todayOrders ? Math.round(todayRevenue / todayOrders) : 0,
    repeatCustomerPct: totalCustomers ? Math.round((repeat / totalCustomers) * 100) : 0,
    revenueSeries: series.map((s) => ({ date: s._id, revenue: s.revenue, orders: s.orders })),
    topProducts: topProducts.map((p) => ({
      productId: String(p._id),
      name: p.name,
      sold: p.sold,
      revenue: p.revenue,
    })),
    peakHours: peakHours.map((h) => ({ hour: h._id, orders: h.orders })),
    lowStock: lowStock.map((p) => ({ productId: String(p._id), name: p.name, stock: p.stock ?? 0 })),
    loyaltyRedemptions: 0,
  };
}
