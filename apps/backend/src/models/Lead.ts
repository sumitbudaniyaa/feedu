import { Schema, model, type InferSchemaType } from 'mongoose';

/** A sales/demo enquiry captured from the public landing site. */
const leadSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    restaurantName: { type: String },
    city: { type: String },
    message: { type: String },
    type: { type: String, enum: ['demo', 'sales'], required: true },
    status: { type: String, enum: ['new', 'contacted', 'converted', 'closed'], default: 'new', index: true },
  },
  { timestamps: true },
);

leadSchema.index({ createdAt: -1 });

export type LeadDoc = InferSchemaType<typeof leadSchema>;
export const Lead = model('Lead', leadSchema);
