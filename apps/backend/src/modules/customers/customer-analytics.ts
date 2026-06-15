import { Customer, Order, Redemption } from '../../models/index.js';

const REVENUE_STATUSES = ['confirmed', 'preparing', 'ready', 'served', 'completed'];

/** Rich per-diner analytics derived from their orders (shared by admin + platform). */
export async function getCustomerAnalytics(restaurantId: string, phone: string) {
  const [customer, orders, redemptions] = await Promise.all([
    Customer.findOne({ restaurantId, phone }).lean(),
    Order.find({ restaurantId, customerPhone: phone }).sort({ placedAt: -1 }).lean(),
    Redemption.find({ restaurantId, customerPhone: phone }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  const paid = orders.filter((o) => REVENUE_STATUSES.includes(o.status));

  // Most-ordered items by quantity.
  const itemMap = new Map<string, { name: string; qty: number; spent: number }>();
  for (const o of orders) {
    for (const it of o.items) {
      const e = itemMap.get(it.name) ?? { name: it.name, qty: 0, spent: 0 };
      e.qty += it.quantity;
      e.spent += it.lineTotal;
      itemMap.set(it.name, e);
    }
  }
  const topItems = [...itemMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

  // Spend by hour of day → favourite visit time.
  const hourCounts = new Array(24).fill(0) as number[];
  for (const o of orders) {
    const h = new Date(o.placedAt).getHours();
    hourCounts[h] = (hourCounts[h] ?? 0) + 1;
  }
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

  const rewardClaims = orders.filter((o) => o.isReward || (o.rewardPointsSpent ?? 0) > 0);
  const totalSpent = customer?.totalSpent ?? paid.reduce((s, o) => s + o.total, 0);
  const totalOrders = customer?.totalOrders ?? orders.length;

  return {
    customer: customer ?? { phone, name: undefined, points: 0 },
    totalSpent,
    totalOrders,
    avgOrderValue: totalOrders ? Math.round(totalSpent / totalOrders) : 0,
    points: customer?.points ?? 0,
    firstOrderAt: orders[orders.length - 1]?.placedAt ?? null,
    lastOrderAt: customer?.lastOrderAt ?? orders[0]?.placedAt ?? null,
    peakHour: orders.length ? peakHour : null,
    topItems,
    rewardClaimCount: rewardClaims.length,
    rewardClaims: rewardClaims.slice(0, 10),
    redemptions,
    recentOrders: orders.slice(0, 10),
  };
}
