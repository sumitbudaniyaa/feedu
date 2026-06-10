import { Schema, model, type InferSchemaType } from 'mongoose';

const variantSchema = new Schema(
  { label: { type: String, required: true }, price: { type: Number, required: true }, sku: String },
  { _id: false },
);

const addonSchema = new Schema(
  {
    label: { type: String, required: true },
    price: { type: Number, required: true },
    maxQty: { type: Number, default: 1 },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: String,
    image: { url: String, alt: String },
    basePrice: { type: Number, required: true },
    variants: { type: [variantSchema], default: [] },
    addons: { type: [addonSchema], default: [] },
    isVeg: Boolean,
    tags: { type: [String], default: [] },
    stock: { type: Number, default: null },
    lowStockThreshold: { type: Number, default: 5 },
    isAvailable: { type: Boolean, default: true },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

productSchema.index({ restaurantId: 1, categoryId: 1 });
productSchema.index({ restaurantId: 1, name: 'text', tags: 'text' });

export type ProductDoc = InferSchemaType<typeof productSchema>;
export const Product = model('Product', productSchema);
