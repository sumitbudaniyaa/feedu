import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * A diner tracked per restaurant by mobile number (guest checkout — no account).
 * Accrues loyalty points and spend across orders.
 */
const customerSchema = new Schema(
  {
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    phone: { type: String, required: true },
    name: { type: String },
    points: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastOrderAt: { type: Date },
  },
  { timestamps: true },
);

// One record per phone per restaurant.
customerSchema.index({ restaurantId: 1, phone: 1 }, { unique: true });

export type CustomerDoc = InferSchemaType<typeof customerSchema>;
export const Customer = model('Customer', customerSchema);
