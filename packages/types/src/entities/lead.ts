import { z } from 'zod';
import { objectIdSchema } from '../common.js';

/** Where the lead came from — "Contact sales" form. */
export const leadTypeSchema = z.literal('sales');
export type LeadType = z.infer<typeof leadTypeSchema>;

/** Sales-pipeline status, managed in the company portal. */
export const leadStatusSchema = z.enum(['new', 'contacted', 'converted', 'closed']);
export type LeadStatus = z.infer<typeof leadStatusSchema>;

export const leadSchema = z.object({
  _id: objectIdSchema,
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(6),
  restaurantName: z.string().optional(),
  city: z.string().optional(),
  message: z.string().optional(),
  type: leadTypeSchema,
  status: leadStatusSchema.default('new'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Lead = z.infer<typeof leadSchema>;

/** Public submission payload from the landing site. */
export const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(6, 'Enter a valid phone'),
  restaurantName: z.string().optional(),
  city: z.string().optional(),
  message: z.string().optional(),
  type: leadTypeSchema,
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

/** Portal update (status only). */
export const updateLeadSchema = z.object({ status: leadStatusSchema });
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
