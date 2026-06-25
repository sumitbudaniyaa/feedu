import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * A diner's favorited menu item, tracked per restaurant by mobile number
 * (same identity model as Customer — keyed by the OTP-verified phone).
 */
const favoriteSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    phone: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  },
  { timestamps: true },
);

// One favorite per product per phone per restaurant.
favoriteSchema.index({ restaurantId: 1, phone: 1, productId: 1 }, { unique: true });

export type FavoriteDoc = InferSchemaType<typeof favoriteSchema>;
export const Favorite = model('Favorite', favoriteSchema);
