/**
 * Dynamic subscription pricing — feature-driven, no hardcoded plans.
 *
 *   finalPrice = basePrice
 *              + Σ feature charges (enabled features)
 *              + branch charges (per extra branch)
 *              + custom adjustments (discount/surcharge, can be negative)
 *
 * `mrr` normalizes the per-cycle price to a monthly figure for platform metrics.
 */

export interface FeatureCharge {
  key: string;
  price: number;
}

export interface PricingInput {
  basePrice?: number;
  /** Enabled feature charges (price per cycle). */
  featureCharges?: FeatureCharge[];
  /** Per-branch fee × billable branches (e.g. branches beyond the first). */
  branchFee?: number;
  branchCount?: number;
  /** Free branches included before branchFee applies (default 1 = the home branch). */
  includedBranches?: number;
  /** Manual discount (negative) or surcharge (positive). */
  customAdjustments?: number;
  billingCycle?: 'monthly' | 'quarterly' | 'yearly';
}

export interface PricingResult {
  basePrice: number;
  featureCharges: FeatureCharge[];
  featureTotal: number;
  branchCharges: number;
  customAdjustments: number;
  /** Total charged per billing cycle. */
  finalPrice: number;
  /** Monthly recurring revenue (per-cycle price normalized to a month). */
  mrr: number;
}

const CYCLE_MONTHS: Record<string, number> = { monthly: 1, quarterly: 3, yearly: 12 };

export function computeSubscriptionPrice(input: PricingInput): PricingResult {
  const basePrice = Math.max(0, input.basePrice ?? 0);
  const featureCharges = (input.featureCharges ?? []).filter((f) => f && f.price >= 0);
  const featureTotal = featureCharges.reduce((s, f) => s + f.price, 0);

  const included = input.includedBranches ?? 1;
  const billableBranches = Math.max(0, (input.branchCount ?? 1) - included);
  const branchCharges = billableBranches * Math.max(0, input.branchFee ?? 0);

  const customAdjustments = input.customAdjustments ?? 0;

  const finalPrice = Math.max(0, basePrice + featureTotal + branchCharges + customAdjustments);
  const months = CYCLE_MONTHS[input.billingCycle ?? 'monthly'] ?? 1;
  const mrr = Math.round(finalPrice / months);

  return { basePrice, featureCharges, featureTotal, branchCharges, customAdjustments, finalPrice, mrr };
}
