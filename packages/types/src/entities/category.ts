import { z } from 'zod';
import { imageSchema, objectIdSchema } from '../common.js';

export const categorySchema = z.object({
  _id: objectIdSchema,
  restaurantId: objectIdSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  image: imageSchema.optional(),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Category = z.infer<typeof categorySchema>;

export const createCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  image: imageSchema.optional(),
  order: z.number().int().optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
