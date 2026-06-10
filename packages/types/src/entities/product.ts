import { z } from 'zod';
import { imageSchema, moneySchema, objectIdSchema } from '../common.js';

/** A selectable size/portion variant, e.g. Half/Full or S/M/L. */
export const variantSchema = z.object({
  label: z.string().min(1),
  price: moneySchema,
  sku: z.string().optional(),
});

/** Optional add-on, e.g. extra cheese. */
export const addonSchema = z.object({
  label: z.string().min(1),
  price: moneySchema,
  maxQty: z.number().int().min(1).default(1),
});

export const productSchema = z.object({
  _id: objectIdSchema,
  restaurantId: objectIdSchema,
  categoryId: objectIdSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  image: imageSchema.optional(),
  basePrice: moneySchema,
  variants: z.array(variantSchema).default([]),
  addons: z.array(addonSchema).default([]),
  isVeg: z.boolean().optional(),
  tags: z.array(z.string()).default([]),
  /** Inventory-tracked stock; null = not tracked (always available). */
  stock: z.number().int().nullable().default(null),
  lowStockThreshold: z.number().int().min(0).default(5),
  isAvailable: z.boolean().default(true),
  rating: z.number().min(0).max(5).default(0),
  ratingCount: z.number().int().min(0).default(0),
  soldCount: z.number().int().min(0).default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Product = z.infer<typeof productSchema>;
export type Variant = z.infer<typeof variantSchema>;
export type Addon = z.infer<typeof addonSchema>;

export const createProductSchema = z.object({
  categoryId: objectIdSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  image: imageSchema.optional(),
  basePrice: moneySchema,
  variants: z.array(variantSchema).optional(),
  addons: z.array(addonSchema).optional(),
  isVeg: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  stock: z.number().int().nullable().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  isAvailable: z.boolean().optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
