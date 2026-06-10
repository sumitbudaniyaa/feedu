import { z } from 'zod';
import { moneySchema, objectIdSchema } from '../common.js';
import { paymentMethodSchema, paymentStatusSchema } from '../enums.js';

export const paymentSchema = z.object({
  _id: objectIdSchema,
  restaurantId: objectIdSchema,
  orderId: objectIdSchema,
  amount: moneySchema,
  currency: z.string().default('INR'),
  method: paymentMethodSchema,
  status: paymentStatusSchema,
  /** Gateway reference (Razorpay/Stripe id). */
  providerRef: z.string().optional(),
  refundedAmount: moneySchema.default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Payment = z.infer<typeof paymentSchema>;
