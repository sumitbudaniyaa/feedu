import { Schema, model, type InferSchemaType } from 'mongoose';

const categorySchema = new Schema(
  {
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: String,
    image: { url: String, alt: String },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

categorySchema.index({ restaurantId: 1, order: 1 });

export type CategoryDoc = InferSchemaType<typeof categorySchema>;
export const Category = model('Category', categorySchema);
