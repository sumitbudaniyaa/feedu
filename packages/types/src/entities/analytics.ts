import { z } from 'zod';
import { objectIdSchema } from '../common.js';

/** Returned by the analytics module; not necessarily a stored collection. */
export interface RevenuePoint {
  date: string; // ISO date
  revenue: number;
  orders: number;
}

export interface DashboardStats {
  revenueToday: number;
  revenueChangePct: number;
  ordersToday: number;
  ordersChangePct: number;
  avgOrderValue: number;
  repeatCustomerPct: number;
  revenueSeries: RevenuePoint[];
  topProducts: { productId: string; name: string; sold: number; revenue: number }[];
  peakHours: { hour: number; orders: number }[];
  lowStock: { productId: string; name: string; stock: number }[];
  loyaltyRedemptions: number;
}

export const analyticsRangeSchema = z.object({
  range: z.enum(['day', 'week', 'month']).default('week'),
  restaurantId: objectIdSchema.optional(),
});
export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>;
