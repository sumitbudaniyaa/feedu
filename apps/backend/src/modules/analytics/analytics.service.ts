import type { BranchComparison, DashboardStats } from '@feedo/types';
import { Types } from 'mongoose';
import { Order, Product, Restaurant, Table } from '../../models/index.js';

const REVENUE_STATUSES = ['confirmed', 'preparing', 'ready', 'served', 'completed'];

function rangeStartFor(range: 'day' | 'week' | 'month'): Date {
  const today = startOfDay();
  const rangeDays = range === 'day' ? 1 : range === 'week' ? 7 : 30;
  return new Date(today.getTime() - (rangeDays - 1) * 86400000);
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function pct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Number((((curr - prev) / prev) * 100).toFixed(1));
}

interface DashboardScope {
  /** Order/Table tenant filter (ObjectIds already cast for aggregation). */
  tenantMatch: Record<string, unknown>;
  /** Catalog filter for low-stock (branch `restaurantId` or brand `brandId`). */
  productFilter: Record<string, unknown>;
}

/** Dashboard stats for a single branch (the active outlet). */
export async function getDashboardStats(
  restaurantId: string,
  range: 'day' | 'week' | 'month' = 'week',
  brandId?: string | null,
): Promise<DashboardStats> {
  // Aggregation pipelines do NOT auto-cast — restaurantId must be a real ObjectId.
  const rid = new Types.ObjectId(restaurantId);
  // The catalog is brand-level, so low-stock reads by brand (falls back to the
  // branch for legacy data without a brand).
  const productFilter = brandId ? { brandId } : { restaurantId };
  return computeDashboard({ tenantMatch: { restaurantId: rid }, productFilter }, range);
}

/** Combined dashboard stats across every branch of a brand ("All branches"). */
export async function getBrandDashboardStats(
  brandId: string,
  range: 'day' | 'week' | 'month' = 'week',
): Promise<DashboardStats> {
  const branches = await Restaurant.find({ brandId }).select('_id').lean();
  const ids = branches.map((b) => b._id);
  return computeDashboard({ tenantMatch: { restaurantId: { $in: ids } }, productFilter: { brandId } }, range);
}

/** Compute the admin dashboard stats from real order data for a given scope. */
async function computeDashboard(
  { tenantMatch, productFilter }: DashboardScope,
  range: 'day' | 'week' | 'month' = 'week',
): Promise<DashboardStats> {
  const rangeDays = range === 'day' ? 1 : range === 'week' ? 7 : 30;
  const rangeStart = rangeStartFor(range);
  // Previous equivalent window, for the change %.
  const prevStart = new Date(rangeStart.getTime() - rangeDays * 86400000);

  const matchPaid = { ...tenantMatch, status: { $in: REVENUE_STATUSES } } as Record<string, unknown>;

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
        ...productFilter,
        stock: { $ne: null },
        $expr: { $lte: ['$stock', '$lowStockThreshold'] },
      })
        .select('name stock')
        .limit(10)
        .lean(),
      // Diners are identified by phone (customerId refs a User and is null for guests).
      Order.aggregate([
        { $match: { ...matchPaid, customerPhone: { $ne: null } } },
        { $group: { _id: '$customerPhone', orders: { $sum: 1 } } },
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
            ...tenantMatch,
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
      Table.countDocuments({ ...tenantMatch, isActive: true }),
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

/**
 * Compare every branch of a brand over a range (brand-wide roles only).
 * Branches with no orders in the window are still listed (revenue 0) so the
 * brand owner sees the full footprint, not just the active outlets.
 */
export async function getBranchComparison(
  brandId: string,
  range: 'day' | 'week' | 'month' = 'week',
): Promise<BranchComparison> {
  const rangeStart = rangeStartFor(range);
  const branches = await Restaurant.find({ brandId }).select('name slug isLive').sort({ createdAt: 1 }).lean();
  const branchIds = branches.map((b) => b._id);

  // Match by branch id ($in) rather than brandId so it holds regardless of
  // whether every historical order was stamped with a brand.
  const agg = await Order.aggregate([
    { $match: { restaurantId: { $in: branchIds }, status: { $in: REVENUE_STATUSES }, placedAt: { $gte: rangeStart } } },
    { $group: { _id: '$restaurantId', revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
  ]);
  const byBranch = new Map(agg.map((a) => [String(a._id), a]));

  const totalRevenue = agg.reduce((s, a) => s + a.revenue, 0);
  const totalOrders = agg.reduce((s, a) => s + a.orders, 0);

  const rows = branches.map((b) => {
    const stat = byBranch.get(String(b._id));
    const revenue = stat?.revenue ?? 0;
    const orders = stat?.orders ?? 0;
    return {
      branchId: String(b._id),
      name: b.name,
      slug: b.slug,
      isLive: b.isLive,
      revenue,
      orders,
      avgOrderValue: orders ? Math.round(revenue / orders) : 0,
      revenueSharePct: totalRevenue ? Number(((revenue / totalRevenue) * 100).toFixed(1)) : 0,
    };
  });
  // Rank by revenue so the strongest branch leads the comparison.
  rows.sort((a, b) => b.revenue - a.revenue);

  return {
    range,
    branches: rows,
    totals: {
      revenue: totalRevenue,
      orders: totalOrders,
      avgOrderValue: totalOrders ? Math.round(totalRevenue / totalOrders) : 0,
      branchCount: branches.length,
      liveBranchCount: branches.filter((b) => b.isLive).length,
    },
  };
}
