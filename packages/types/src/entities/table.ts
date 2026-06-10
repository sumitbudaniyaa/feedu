import { z } from 'zod';
import { objectIdSchema } from '../common.js';

export const tableSchema = z.object({
  _id: objectIdSchema,
  restaurantId: objectIdSchema,
  name: z.string().min(1), // e.g. "Table 12", "Patio 3"
  /** Stable token embedded in the QR; resolves to this table when scanned. */
  qrToken: z.string().min(1),
  seats: z.number().int().min(1).default(2),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Table = z.infer<typeof tableSchema>;

export const createTableSchema = z.object({
  name: z.string().min(1),
  seats: z.number().int().min(1).optional(),
});
export type CreateTableInput = z.infer<typeof createTableSchema>;

/** Bulk-create N tables during onboarding. */
export const generateTablesSchema = z.object({
  count: z.number().int().min(1).max(200),
  prefix: z.string().default('Table'),
});
export type GenerateTablesInput = z.infer<typeof generateTablesSchema>;
