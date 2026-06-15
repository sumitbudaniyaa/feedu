import { Schema, model, type InferSchemaType } from 'mongoose';

const loyaltyProgramSchema = new Schema(
  {
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ['repeat_order', 'points', 'visit_based', 'category_based'],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    conditions: {
      everyNthOrder: Number,
      requiredVisits: Number,
      pointsPerCurrency: Number,
      pointsToRedeem: Number,
      categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
      requiredCategoryPurchases: Number,
      minOrderValue: Number,
    },
    rewardProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
    rewardDescription: String,
    expiryDays: Number,
  },
  { timestamps: true },
);

const earnedRewardSchema = new Schema(
  {
    programId: { type: Schema.Types.ObjectId, ref: 'LoyaltyProgram', required: true },
    earnedAt: { type: Date, default: Date.now },
    expiresAt: Date,
    redeemed: { type: Boolean, default: false },
    redeemedAt: Date,
  },
  { _id: false },
);

const customerLoyaltySchema = new Schema(
  {
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    points: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalVisits: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    categoryCounts: { type: Map, of: Number, default: {} },
    earnedRewards: { type: [earnedRewardSchema], default: [] },
  },
  { timestamps: true },
);

customerLoyaltySchema.index({ restaurantId: 1, customerId: 1 }, { unique: true });

export type LoyaltyProgramDoc = InferSchemaType<typeof loyaltyProgramSchema>;
export type CustomerLoyaltyDoc = InferSchemaType<typeof customerLoyaltySchema>;
export const LoyaltyProgram = model('LoyaltyProgram', loyaltyProgramSchema);
export const CustomerLoyalty = model('CustomerLoyalty', customerLoyaltySchema);
