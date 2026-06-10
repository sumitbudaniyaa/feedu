import { z } from 'zod';
import { moneySchema, objectIdSchema } from '../common.js';
import { loyaltyRewardTypeSchema } from '../enums.js';

export const loyaltyProgramSchema = z.object({
  _id: objectIdSchema,
  restaurantId: objectIdSchema,
  title: z.string().min(1),
  type: loyaltyRewardTypeSchema,
  isActive: z.boolean().default(true),
  conditions: z.object({
    /** repeat_order: every Nth order. */
    everyNthOrder: z.number().int().min(1).optional(),
    /** visit_based: number of qualifying visits. */
    requiredVisits: z.number().int().min(1).optional(),
    /** points: points granted per unit currency spent. */
    pointsPerCurrency: z.number().min(0).optional(),
    /** points: points needed to redeem. */
    pointsToRedeem: z.number().int().min(1).optional(),
    /** category_based: scope to a category. */
    categoryId: objectIdSchema.optional(),
    requiredCategoryPurchases: z.number().int().min(1).optional(),
    minOrderValue: moneySchema.optional(),
  }),
  /** Gift granted on redemption. */
  rewardProductId: objectIdSchema.optional(),
  rewardDescription: z.string().optional(),
  expiryDays: z.number().int().min(0).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type LoyaltyProgram = z.infer<typeof loyaltyProgramSchema>;

/** Per-customer, per-restaurant loyalty progress. */
export const customerLoyaltySchema = z.object({
  _id: objectIdSchema,
  restaurantId: objectIdSchema,
  customerId: objectIdSchema,
  points: z.number().int().min(0).default(0),
  totalOrders: z.number().int().min(0).default(0),
  totalVisits: z.number().int().min(0).default(0),
  totalSpent: moneySchema.default(0),
  categoryCounts: z.record(z.number().int()).default({}),
  earnedRewards: z
    .array(
      z.object({
        programId: objectIdSchema,
        earnedAt: z.coerce.date(),
        expiresAt: z.coerce.date().optional(),
        redeemed: z.boolean().default(false),
        redeemedAt: z.coerce.date().optional(),
      }),
    )
    .default([]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type CustomerLoyalty = z.infer<typeof customerLoyaltySchema>;

export const createLoyaltyProgramSchema = loyaltyProgramSchema.omit({
  _id: true,
  restaurantId: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateLoyaltyProgramInput = z.infer<typeof createLoyaltyProgramSchema>;
