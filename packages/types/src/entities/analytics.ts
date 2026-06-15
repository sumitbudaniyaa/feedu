import { z } from 'zod';
import { objectIdSchema } from '../common.js';

/** Returned by the analytics module; not necessarily a stored collection. */
export interface RevenuePoint {
  date: string; // ISO date
  revenue: number;
  orders: number;
}

export interface DashboardStats {
  /** Revenue/orders for the selected range (day/week/month). */
  revenue: number;
  revenueChangePct: number;
  orders: number;
  ordersChangePct: number;
  avgOrderValue: number;
  repeatCustomerPct: number;
  revenueSeries: RevenuePoint[];
  topProducts: { productId: string; name: string; sold: number; revenue: number }[];
  peakHours: { hour: number; orders: number }[];
  lowStock: { productId: string; name: string; stock: number }[];
  loyaltyRedemptions: number;
  channelMix: { channel: string; orders: number; revenue: number }[];
  /** Orders/revenue split by service type (dine_in / takeaway) for the range. */
  orderTypeMix: { type: string; orders: number; revenue: number }[];
  /** Active table count (for table-efficiency metrics). */
  tableCount: number;
  /** Range revenue divided by active tables. */
  revenuePerTable: number;
  /** Dine-in parties served per table over the range. */
  tableTurnover: number;
  /** Average minutes from order placed to completed (0 if not measurable). */
  avgCompletionMinutes: number;
}

/** One branch's headline numbers within a range (brand-wide comparison view). */
export interface BranchPerformance {
  branchId: string;
  name: string;
  slug: string;
  isLive: boolean;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  /** Share of the brand's range revenue, 0–100. */
  revenueSharePct: number;
}

/** Brand → branch comparison across a range (brand-wide roles only). */
export interface BranchComparison {
  range: 'day' | 'week' | 'month';
  branches: BranchPerformance[];
  totals: {
    revenue: number;
    orders: number;
    avgOrderValue: number;
    branchCount: number;
    liveBranchCount: number;
  };
}

export const analyticsRangeSchema = z.object({
  range: z.enum(['day', 'week', 'month']).default('week'),
  restaurantId: objectIdSchema.optional(),
});
export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>;
