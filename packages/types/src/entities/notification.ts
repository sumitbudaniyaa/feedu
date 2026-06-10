import { z } from 'zod';
import { objectIdSchema } from '../common.js';
import { notificationTypeSchema } from '../enums.js';

export const notificationSchema = z.object({
  _id: objectIdSchema,
  restaurantId: objectIdSchema,
  /** Optional target user; null = broadcast to restaurant staff. */
  userId: objectIdSchema.nullable().optional(),
  type: notificationTypeSchema,
  title: z.string().min(1),
  body: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  read: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Notification = z.infer<typeof notificationSchema>;
