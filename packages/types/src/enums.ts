import { z } from 'zod';

/**
 * User / staff roles. Drives RBAC across the platform.
 * Multi-branch roles are added alongside the legacy ones (kept for back-compat):
 *   owner ≈ brand_owner, manager ≈ branch_manager, kitchen ≈ kitchen_staff.
 */
export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  // Brand (tenant) level
  BRAND_OWNER: 'brand_owner',
  BRAND_ADMIN: 'brand_admin',
  // Branch level
  BRANCH_MANAGER: 'branch_manager',
  KITCHEN_STAFF: 'kitchen_staff',
  CASHIER: 'cashier',
  // Legacy (still valid)
  OWNER: 'owner',
  MANAGER: 'manager',
  KITCHEN: 'kitchen',
  WAITER: 'waiter',
  CUSTOMER: 'customer',
} as const;
export const userRoleSchema = z.enum([
  'super_admin',
  'brand_owner',
  'brand_admin',
  'branch_manager',
  'kitchen_staff',
  'cashier',
  // legacy
  'owner',
  'manager',
  'kitchen',
  'waiter',
  'customer',
]);
export type UserRoleType = z.infer<typeof userRoleSchema>;

/** Roles considered brand-wide (see all branches of their brand). */
export const BRAND_WIDE_ROLES = ['owner', 'brand_owner', 'brand_admin'] as const;

/** Staff roles assignable within a restaurant/branch (excludes platform + customer). */
export const staffRoleSchema = z.enum([
  'manager',
  'kitchen',
  'waiter',
  'branch_manager',
  'kitchen_staff',
  'cashier',
]);
export type StaffRole = z.infer<typeof staffRoleSchema>;

export const orderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'served',
  'completed',
  'cancelled',
  'refunded',
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderTypeSchema = z.enum(['dine_in', 'takeaway']);
export type OrderType = z.infer<typeof orderTypeSchema>;

/** Where the order came from — own app, counter, or a delivery aggregator. */
export const orderChannelSchema = z.enum(['app', 'counter', 'zomato', 'swiggy', 'district']);
export type OrderChannel = z.infer<typeof orderChannelSchema>;

export const paymentStatusSchema = z.enum(['unpaid', 'paid', 'refunded', 'failed']);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const paymentMethodSchema = z.enum([
  'cash',
  'card',
  'upi',
  'razorpay',
  'stripe',
  'reward',
  'zomato',
  'swiggy',
  'district',
]);
/** Methods an admin can record a manual payment against. */
export const manualPaymentMethodSchema = z.enum(['cash', 'upi', 'card', 'zomato', 'swiggy', 'district']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const sectionLayoutSchema = z.enum(['carousel', 'hero', 'grid']);
export type SectionLayout = z.infer<typeof sectionLayoutSchema>;

export const loyaltyRewardTypeSchema = z.enum([
  'repeat_order',
  'points',
  'visit_based',
  'category_based',
]);
export type LoyaltyRewardType = z.infer<typeof loyaltyRewardTypeSchema>;

export const subscriptionPlanSchema = z.enum(['trial', 'starter', 'growth', 'enterprise']);
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;

export const subscriptionStatusSchema = z.enum(['active', 'past_due', 'cancelled', 'trialing']);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const notificationTypeSchema = z.enum([
  'order',
  'loyalty',
  'inventory',
  'system',
  'payment',
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;
