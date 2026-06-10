import { z } from 'zod';
import { imageSchema, objectIdSchema } from '../common.js';
import { sectionLayoutSchema } from '../enums.js';

/** Dynamic homepage section rendered in the customer app (Menu CMS). */
export const sectionSchema = z.object({
  _id: objectIdSchema,
  restaurantId: objectIdSchema,
  title: z.string().min(1), // "Today's Best", "Chef Specials"
  subtitle: z.string().optional(),
  layout: sectionLayoutSchema,
  banner: imageSchema.optional(),
  productIds: z.array(objectIdSchema).default([]),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
  schedule: z
    .object({
      startsAt: z.coerce.date().optional(),
      endsAt: z.coerce.date().optional(),
    })
    .optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Section = z.infer<typeof sectionSchema>;

export const createSectionSchema = sectionSchema.omit({
  _id: true,
  restaurantId: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateSectionInput = z.infer<typeof createSectionSchema>;

export const updateSectionSchema = createSectionSchema.partial();
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;

export const reorderSectionsSchema = z.object({
  /** Section ids in their new display order. */
  orderedIds: z.array(objectIdSchema),
});
export type ReorderSectionsInput = z.infer<typeof reorderSectionsSchema>;
