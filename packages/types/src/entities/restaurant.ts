import { z } from 'zod';
import { imageSchema, objectIdSchema } from '../common.js';
import { accentKeys } from './branding.js';

export const dayHoursSchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/), // "09:00"
  close: z.string().regex(/^\d{2}:\d{2}$/),
  closed: z.boolean().default(false),
});

export const timingsSchema = z.object({
  monday: dayHoursSchema,
  tuesday: dayHoursSchema,
  wednesday: dayHoursSchema,
  thursday: dayHoursSchema,
  friday: dayHoursSchema,
  saturday: dayHoursSchema,
  sunday: dayHoursSchema,
});

export const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().default('India'),
});

export const onboardingStateSchema = z.object({
  completed: z.boolean().default(false),
  currentStep: z.number().int().min(0).max(8).default(0),
  progress: z.number().min(0).max(100).default(0),
  completedSteps: z.array(z.string()).default([]),
});

export const restaurantSchema = z.object({
  _id: objectIdSchema,
  ownerId: objectIdSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  cuisineType: z.array(z.string()).default([]),
  logo: imageSchema.optional(),
  banner: imageSchema.optional(),
  contactNumber: z.string().optional(),
  address: addressSchema.optional(),
  timings: timingsSchema.optional(),
  branding: z
    .object({
      accent: z.enum(accentKeys).default('violet'),
      themeMode: z.enum(['dark', 'light']).default('dark'),
    })
    .default({ accent: 'violet', themeMode: 'dark' }),
  tax: z
    .object({
      gstNumber: z.string().optional(),
      gstPercent: z.number().min(0).max(100).default(5),
      inclusive: z.boolean().default(false),
    })
    .default({ gstPercent: 5, inclusive: false }),
  currency: z.string().default('INR'),
  onboarding: onboardingStateSchema.default({}),
  isLive: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Restaurant = z.infer<typeof restaurantSchema>;

export const createRestaurantSchema = restaurantSchema
  .pick({ name: true, description: true, cuisineType: true, contactNumber: true })
  .partial({ description: true, cuisineType: true, contactNumber: true })
  .extend({ name: z.string().min(2) });
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;

export const updateRestaurantSchema = restaurantSchema
  .omit({ _id: true, ownerId: true, slug: true, createdAt: true, updatedAt: true })
  .partial();
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
