import { Schema, model, type InferSchemaType } from 'mongoose';

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    isVeg: Boolean,
    prepTimeMinutes: Number,
    variantLabel: String,
    addons: { type: [{ label: String, price: Number }], default: [] },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    notes: String,
    lineTotal: { type: Number, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    orderNumber: { type: String, required: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', default: null },
    tableName: { type: String },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    // Guest contact captured at checkout (orders can be placed anonymously).
    customerName: { type: String },
    customerPhone: { type: String },
    type: { type: String, enum: ['dine_in', 'takeaway'], required: true },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'served',
        'completed',
        'cancelled',
        'refunded',
      ],
      default: 'pending',
      index: true,
    },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    loyaltyPointsEarned: { type: Number, default: 0 },
    loyaltyRewardApplied: { type: Schema.Types.ObjectId, ref: 'LoyaltyReward', default: null },
    isReward: { type: Boolean, default: false },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded', 'failed'],
      default: 'unpaid',
    },
    paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'razorpay', 'stripe', 'reward'] },
    notes: String,
    placedAt: { type: Date, default: Date.now },
    readyAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
);

// Hot paths: active orders for kitchen, history for admin, analytics by date.
orderSchema.index({ restaurantId: 1, status: 1, placedAt: -1 });
orderSchema.index({ restaurantId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, orderNumber: 1 }, { unique: true });

export type OrderDoc = InferSchemaType<typeof orderSchema>;
export const Order = model('Order', orderSchema);
