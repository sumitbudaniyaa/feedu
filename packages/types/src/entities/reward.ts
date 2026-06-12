import { z } from 'zod';
import { imageSchema, objectIdSchema } from '../common.js';

/**
 * A claimable reward in the restaurant's loyalty catalog,
 * e.g. "Free Coffee" for 50 points.
 */
export const loyaltyRewardSchema = z.object({
  _id: objectIdSchema,
  restaurantId: objectIdSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  /** Points deducted from the diner's wallet on claim. */
  pointsCost: z.number().int().min(1),
  /** Optional linked menu product (for the kitchen / imagery). */
  productId: objectIdSchema.nullable().optional(),
  image: imageSchema.optional(),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type LoyaltyReward = z.infer<typeof loyaltyRewardSchema>;

export const createLoyaltyRewardSchema = loyaltyRewardSchema.omit({
  _id: true,
  restaurantId: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateLoyaltyRewardInput = z.infer<typeof createLoyaltyRewardSchema>;

export const redemptionStatusSchema = z.enum(['pending', 'fulfilled', 'cancelled']);
export type RedemptionStatus = z.infer<typeof redemptionStatusSchema>;

/** A diner's claim of a reward — points already deducted; staff fulfils by code. */
export const redemptionSchema = z.object({
  _id: objectIdSchema,
  restaurantId: objectIdSchema,
  customerPhone: z.string(),
  customerName: z.string().optional(),
  rewardId: objectIdSchema,
  rewardTitle: z.string(), // snapshot at claim time
  pointsCost: z.number().int().min(0),
  /** Short code the diner shows to staff. */
  code: z.string(),
  status: redemptionStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Redemption = z.infer<typeof redemptionSchema>;
