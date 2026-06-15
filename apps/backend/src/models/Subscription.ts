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
    /** What the restaurant pays Feedo per billing cycle. */
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
