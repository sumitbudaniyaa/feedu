import { Schema, model, type InferSchemaType } from 'mongoose';

/** Claimable loyalty reward (e.g. "Free Coffee" for 50 points). */
const loyaltyRewardSchema = new Schema(
  {
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    // Brand-owned; restaurantId is legacy (the brand's home branch).
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', index: true },
    title: { type: String, required: true, trim: true },
    description: String,
    pointsCost: { type: Number, required: true, min: 1 },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    image: { url: String, alt: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

/** A diner's claim — points already deducted; staff fulfils by code. */
const redemptionSchema = new Schema(
  {
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    customerPhone: { type: String, required: true, index: true },
    customerName: String,
    rewardId: { type: Schema.Types.ObjectId, ref: 'LoyaltyReward', required: true },
    rewardTitle: { type: String, required: true },
    pointsCost: { type: Number, required: true },
    code: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'fulfilled', 'cancelled'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true },
);

redemptionSchema.index({ restaurantId: 1, code: 1 }, { unique: true });

export type LoyaltyRewardDoc = InferSchemaType<typeof loyaltyRewardSchema>;
export type RedemptionDoc = InferSchemaType<typeof redemptionSchema>;
export const LoyaltyReward = model('LoyaltyReward', loyaltyRewardSchema);
export const Redemption = model('Redemption', redemptionSchema);
