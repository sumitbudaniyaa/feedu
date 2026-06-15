import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * A Brand is the tenant in the multi-branch model. It owns the shared menu,
 * branding, loyalty and subscription; individual outlets are `Restaurant`
 * documents (= branches) that reference this brand via `brandId`.
 *
 * Phase 0/1: introduced additively. Existing single-outlet restaurants are
 * migrated to one brand each, so `restaurantId` keeps meaning "branch".
 */
const brandSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: String,
    cuisineType: { type: [String], default: [] },
    branding: {
      accent: {
        type: String,
        enum: ['emerald', 'violet', 'blue', 'amber', 'rose', 'slate'],
        default: 'violet',
      },
      themeMode: { type: String, enum: ['dark', 'light'], default: 'dark' },
    },
    // Brand-default tax; a branch may override on its own restaurant doc.
    tax: {
      gstNumber: String,
      gstPercent: { type: Number, default: 5 },
      inclusive: { type: Boolean, default: false },
    },
    currency: { type: String, default: 'INR' },
  },
  { timestamps: true },
);

export type BrandDoc = InferSchemaType<typeof brandSchema>;
export const Brand = model('Brand', brandSchema);
