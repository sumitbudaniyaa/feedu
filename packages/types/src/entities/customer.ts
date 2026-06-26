import { z } from 'zod';
import { moneySchema, objectIdSchema } from '../common.js';

/** Guest diner tracked per restaurant by phone (loyalty + spend). */
export const customerSchema = z.object({
  _id: objectIdSchema,
  restaurantId: objectIdSchema,
  phone: z.string(),
  name: z.string().optional(),
  points: z.number().int().min(0).default(0),
  /** Punch-card stamps for the visit-based program. */
  visits: z.number().int().min(0).default(0),
  totalOrders: z.number().int().min(0).default(0),
  totalSpent: moneySchema.default(0),
  lastOrderAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Customer = z.infer<typeof customerSchema>;
