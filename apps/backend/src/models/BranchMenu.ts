import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Per-branch overrides on the shared brand menu. The brand owns the catalog
 * (`Product`); a branch can override price/availability/stock or flag an item as
 * branch-exclusive. Effective values are resolved as:
 *   price        = priceOverride ?? product.basePrice
 *   stock        = stock         ?? product.stock
 *   isAvailable  = isAvailable && product.isAvailable
 *   visible here = product (brand-wide) OR branchExclusive
 */
const branchMenuSchema = new Schema(
  {
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    /** null = inherit the brand's basePrice. */
    priceOverride: { type: Number, default: null },
    isAvailable: { type: Boolean, default: true },
    /** null = inherit the product's stock (or untracked). */
    stock: { type: Number, default: null },
    /** Only offered at this branch (hidden from the brand-wide menu). */
    branchExclusive: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// One override row per product per branch.
branchMenuSchema.index({ branchId: 1, productId: 1 }, { unique: true });

export type BranchMenuDoc = InferSchemaType<typeof branchMenuSchema>;
export const BranchMenu = model('BranchMenu', branchMenuSchema);
