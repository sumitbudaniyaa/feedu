import { Schema, model, type InferSchemaType } from 'mongoose';

const sectionSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    title: { type: String, required: true },
    subtitle: String,
    layout: { type: String, enum: ['carousel', 'hero', 'grid'], required: true },
    banner: { url: String, alt: String },
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    schedule: { startsAt: Date, endsAt: Date },
  },
  { timestamps: true },
);

sectionSchema.index({ restaurantId: 1, order: 1 });

export type SectionDoc = InferSchemaType<typeof sectionSchema>;
export const Section = model('Section', sectionSchema);
