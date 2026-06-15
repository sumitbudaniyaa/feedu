import type { DashboardStats } from '@feedo/types';
import { Types } from 'mongoose';
import { Order, Product, Table } from '../../models/index.js';

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
  const rangeDays = range === 'day' ? 1 : range === 'week' ? 7 : 30;
  const rangeStart = new Date(today.getTime() - (rangeDays - 1) * 86400000);
  // Previous equivalent window, for the change %.
  const prevStart = new Date(rangeStart.getTime() - rangeDays * 86400000);

  // Aggregation pipelines do NOT auto-cast — restaurantId must be a real ObjectId.
  const rid = new Types.ObjectId(restaurantId);
  const matchPaid = { restaurantId: rid, status: { $in: REVENUE_STATUSES } } as Record<string, unknown>;

  const [
    todayAgg,
    yestAgg,
    series,
    topProducts,
    peakHours,
    lowStock,
    allTimeCustomers,
    channels,
    orderTypes,
    completion,
    tableCount,
  ] = await Promise.all([
      // Current selected window (day / week / month).
      Order.aggregate([
        { $match: { ...matchPaid, placedAt: { $gte: rangeStart } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      ]),
      // Previous equivalent window.
      Order.aggregate([
        { $match: { ...matchPaid, placedAt: { $gte: prevStart, $lt: rangeStart } } },
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
      Order.aggregate([
        { $match: { ...matchPaid, placedAt: { $gte: rangeStart } } },
        { $group: { _id: '$channel', orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $sort: { revenue: -1 } },
      ]),
      // Service-type split (dine-in / takeaway).
      Order.aggregate([
        { $match: { ...matchPaid, placedAt: { $gte: rangeStart } } },
        { $group: { _id: '$type', orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $sort: { revenue: -1 } },
      ]),
      // Average completion time (placed → completed), in minutes.
      Order.aggregate([
        {
          $match: {
            restaurantId: rid,
            status: 'completed',
            completedAt: { $ne: null },
            placedAt: { $gte: rangeStart },
          },
        },
        {
          $group: {
            _id: null,
            avgMs: { $avg: { $subtract: ['$completedAt', '$placedAt'] } },
          },
        },
      ]),
      Table.countDocuments({ restaurantId: rid, isActive: true }),
    ]);

  const repeat = allTimeCustomers.filter((c) => c.orders > 1).length;
  const totalCustomers = allTimeCustomers.length;
  const rangeRevenue = todayAgg[0]?.revenue ?? 0;
  const rangeOrders = todayAgg[0]?.orders ?? 0;

  // Table-efficiency metrics (only meaningful when tables exist).
  const dineInOrders = orderTypes.find((t) => t._id === 'dine_in')?.orders ?? 0;
  const revenuePerTable = tableCount ? Math.round(rangeRevenue / tableCount) : 0;
  const tableTurnover = tableCount ? Number((dineInOrders / tableCount).toFixed(1)) : 0;
  const avgCompletionMinutes = completion[0]?.avgMs
    ? Math.round(completion[0].avgMs / 60000)
    : 0;

  return {
    revenue: rangeRevenue,
    revenueChangePct: pct(rangeRevenue, yestAgg[0]?.revenue ?? 0),
    orders: rangeOrders,
    ordersChangePct: pct(rangeOrders, yestAgg[0]?.orders ?? 0),
    avgOrderValue: rangeOrders ? Math.round(rangeRevenue / rangeOrders) : 0,
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
    channelMix: channels.map((c) => ({
      channel: (c._id as string) ?? 'app',
      orders: c.orders,
      revenue: c.revenue,
    })),
    orderTypeMix: orderTypes.map((t) => ({
      type: (t._id as string) ?? 'dine_in',
      orders: t.orders,
      revenue: t.revenue,
    })),
    tableCount,
    revenuePerTable,
    tableTurnover,
    avgCompletionMinutes,
  };
}
