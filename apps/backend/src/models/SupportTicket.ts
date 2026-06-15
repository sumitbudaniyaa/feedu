import { Schema, model, type InferSchemaType } from 'mongoose';

const replySchema = new Schema(
  {
    author: { type: String, enum: ['restaurant', 'feedo'], required: true },
    authorName: String,
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const supportTicketSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    restaurantName: String,
    subject: { type: String, required: true },
    message: { type: String, required: true },
    category: {
      type: String,
      enum: ['billing', 'technical', 'feature', 'other'],
      default: 'other',
    },
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    createdByName: String,
    createdByEmail: String,
    replies: { type: [replySchema], default: [] },
  },
  { timestamps: true },
);

export type SupportTicketDoc = InferSchemaType<typeof supportTicketSchema>;
export const SupportTicket = model('SupportTicket', supportTicketSchema);
