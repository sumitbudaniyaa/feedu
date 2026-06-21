import { z } from 'zod';
import { objectIdSchema } from '../common.js';

/** Live occupancy state of a table (seat-occupancy grid + reservations). */
export const tableStatusSchema = z.enum(['available', 'occupied', 'reserved']);
export type TableStatus = z.infer<typeof tableStatusSchema>;

/** Details captured when a table is reserved. */
export const reservationSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  partySize: z.number().int().min(1).optional(),
  /** Free-form time label, e.g. "7:30 PM". */
  time: z.string().optional(),
  note: z.string().optional(),
});
export type Reservation = z.infer<typeof reservationSchema>;

export const tableSchema = z.object({
  _id: objectIdSchema,
  restaurantId: objectIdSchema,
  name: z.string().min(1), // e.g. "Table 12", "Patio 3"
  /** Stable token embedded in the QR; resolves to this table when scanned. */
  qrToken: z.string().min(1),
  seats: z.number().int().min(1).default(2),
  isActive: z.boolean().default(true),
  status: tableStatusSchema.default('available'),
  reservation: reservationSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Table = z.infer<typeof tableSchema>;

/** Update a table's live occupancy (and optional reservation details). */
export const updateTableStatusSchema = z.object({
  status: tableStatusSchema,
  reservation: reservationSchema.nullable().optional(),
});
export type UpdateTableStatusInput = z.infer<typeof updateTableStatusSchema>;

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
