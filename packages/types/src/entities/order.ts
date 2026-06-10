import { z } from 'zod';
import { moneySchema, objectIdSchema } from '../common.js';
import {
  orderStatusSchema,
  orderTypeSchema,
  paymentMethodSchema,
  paymentStatusSchema,
} from '../enums.js';

export const orderItemSchema = z.object({
  productId: objectIdSchema,
  name: z.string(), // snapshot at order time
  variantLabel: z.string().optional(),
  addons: z
    .array(z.object({ label: z.string(), price: moneySchema }))
    .default([]),
  unitPrice: moneySchema, // base/variant + addons, per unit
  quantity: z.number().int().min(1),
  notes: z.string().optional(),
  lineTotal: moneySchema,
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  _id: objectIdSchema,
  restaurantId: objectIdSchema,
  orderNumber: z.string(), // human-friendly, daily-resetting per restaurant
  tableId: objectIdSchema.nullable().optional(),
  customerId: objectIdSchema.nullable().optional(),
  type: orderTypeSchema,
  status: orderStatusSchema,
  items: z.array(orderItemSchema).min(1),
  subtotal: moneySchema,
  taxAmount: moneySchema,
  discountAmount: moneySchema.default(0),
  total: moneySchema,
  loyaltyPointsEarned: z.number().int().min(0).default(0),
  loyaltyRewardApplied: objectIdSchema.nullable().optional(),
  paymentStatus: paymentStatusSchema,
  paymentMethod: paymentMethodSchema.optional(),
  notes: z.string().optional(),
  placedAt: z.coerce.date(),
  readyAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Order = z.infer<typeof orderSchema>;

/** Cart line submitted by the customer app. */
export const cartItemSchema = z.object({
  productId: objectIdSchema,
  variantLabel: z.string().optional(),
  addonLabels: z.array(z.string()).default([]),
  quantity: z.number().int().min(1),
  notes: z.string().optional(),
});
export type CartItem = z.infer<typeof cartItemSchema>;

export const createOrderSchema = z.object({
  type: orderTypeSchema,
  tableId: objectIdSchema.optional(),
  items: z.array(cartItemSchema).min(1),
  notes: z.string().optional(),
  loyaltyRewardId: objectIdSchema.optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
