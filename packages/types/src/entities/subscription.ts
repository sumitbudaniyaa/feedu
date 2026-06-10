import { z } from 'zod';
import { objectIdSchema } from '../common.js';
import { subscriptionPlanSchema, subscriptionStatusSchema } from '../enums.js';

/** SaaS subscription tied to a restaurant (managed by super-admin). */
export const subscriptionSchema = z.object({
  _id: objectIdSchema,
  restaurantId: objectIdSchema,
  plan: subscriptionPlanSchema,
  status: subscriptionStatusSchema,
  /** Per-restaurant feature flags toggled by super-admin. */
  features: z.record(z.boolean()).default({}),
  seats: z.number().int().min(1).default(5),
  mrr: z.number().min(0).default(0),
  trialEndsAt: z.coerce.date().optional(),
  currentPeriodEnd: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Subscription = z.infer<typeof subscriptionSchema>;
