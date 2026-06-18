import { Schema, model, type InferSchemaType } from 'mongoose';

const paymentSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    method: {
      type: String,
      enum: ['cash', 'card', 'upi', 'razorpay', 'stripe', 'zomato', 'swiggy', 'district'],
      required: true,
    },
    status: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded', 'failed'],
      default: 'unpaid',
    },
    providerRef: String,
    refundedAmount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type PaymentDoc = InferSchemaType<typeof paymentSchema>;
export const Payment = model('Payment', paymentSchema);
