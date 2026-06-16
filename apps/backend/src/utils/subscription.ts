import { Subscription } from '../models/index.js';

/**
 * Resolve the subscription that governs a branch.
 *
 * - single-store: the branch carries its own subscription (`restaurantId`).
 * - multi-store: the brand has one combined subscription covering every branch;
 *   non-home branches have no subscription of their own, so we fall back to the
 *   brand's single subscription (`brandId`).
 */
export async function findEffectiveSubscription(
  branchId: string | undefined,
  brandId: string | undefined | null,
) {
  if (branchId) {
    const own = await Subscription.findOne({ restaurantId: branchId }).lean();
    if (own) return own;
  }
  if (brandId) return Subscription.findOne({ brandId }).lean();
  return null;
}
