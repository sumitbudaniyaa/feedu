import { Schema, model, type InferSchemaType } from 'mongoose';

const subscriptionSchema = new Schema(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      unique: true,
      index: true,
    },
    // Stamped during Phase 1 migration; subscription becomes brand-level in a later phase.
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    plan: {
      type: String,
      enum: ['trial', 'starter', 'growth', 'enterprise'],
      default: 'trial',
    },
    status: {
      type: String,
      enum: ['active', 'past_due', 'cancelled', 'trialing'],
      default: 'trialing',
    },
    features: { type: Map, of: Boolean, default: {} },
    seats: { type: Number, default: 5 },
    mrr: { type: Number, default: 0 },
    // ─── Dynamic feature-based pricing breakdown ───────────────────────────
    /** Flat base fee before feature/branch charges. */
    basePrice: { type: Number, default: 0 },
    /** Per-feature charges that make up the price (enabled features). */
    featureCharges: { type: [{ key: String, price: Number, _id: false }], default: [] },
    branchCharges: { type: Number, default: 0 },
    /** Manual discount (negative) or surcharge (positive). */
    customAdjustments: { type: Number, default: 0 },
    /** Computed total per billing cycle (kept in sync with `price`). */
    finalPrice: { type: Number, default: 0 },
    /** Usage/capacity caps. Absent key or null = unlimited. */
    limits: { type: Map, of: Number, default: {} },
    /** What the restaurant pays Feedu per billing cycle. */
    price: { type: Number, default: 0 },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'monthly',
    },
    trialEndsAt: Date,
    /** Subscription expiry / next renewal date. */
    currentPeriodEnd: Date,
  },
  { timestamps: true },
);

export type SubscriptionDoc = InferSchemaType<typeof subscriptionSchema>;
export const Subscription = model('Subscription', subscriptionSchema);
