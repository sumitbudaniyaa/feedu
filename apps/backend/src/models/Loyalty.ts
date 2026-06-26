import { Schema, model, type InferSchemaType } from 'mongoose';

const loyaltyProgramSchema = new Schema(
  {
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    // Brand-owned; restaurantId is legacy (the brand's home branch).
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', index: true },
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

export type LoyaltyProgramDoc = InferSchemaType<typeof loyaltyProgramSchema>;
export const LoyaltyProgram = model('LoyaltyProgram', loyaltyProgramSchema);
