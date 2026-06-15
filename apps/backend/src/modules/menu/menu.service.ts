import { BranchMenu, Category, Product, Section } from '../../models/index.js';

interface MenuScope {
  /** Brand that owns the shared catalog. Falls back to branch scope when absent (pre-migration). */
  brandId?: string | null;
  /** The branch whose overrides to apply. */
  branchId: string;
}

/**
 * Resolve the effective menu for a branch: the brand-shared catalog merged with
 * that branch's `BranchMenu` overrides.
 *   price       = override.priceOverride ?? product.basePrice
 *   stock       = override.stock         ?? product.stock      (null override = inherit)
 *   isAvailable = (override?.isAvailable ?? true) && product.isAvailable
 *   visible     = not exclusive to another branch
 *
 * Backward compatible: if `brandId` is missing the catalog is read by `restaurantId`
 * (legacy single-tenant behaviour).
 */
export async function resolveBranchMenu({ brandId, branchId }: MenuScope) {
  const catalogFilter = brandId ? { brandId } : { restaurantId: branchId };

  const [categories, products, sections, overrides, exclusives] = await Promise.all([
    Category.find({ ...catalogFilter, isActive: true }).sort({ order: 1 }).lean(),
    Product.find(catalogFilter).sort({ createdAt: -1 }).lean(),
    Section.find({ ...catalogFilter, isActive: true }).sort({ order: 1 }).lean(),
    BranchMenu.find({ branchId }).lean(),
    brandId
      ? BranchMenu.find({ brandId, branchExclusive: true }).select('productId branchId').lean()
      : [],
  ]);

  const overrideByProduct = new Map(overrides.map((o) => [String(o.productId), o]));
  // Products a different branch has claimed as exclusive must not show here.
  const exclusiveElsewhere = new Set(
    exclusives.filter((e) => String(e.branchId) !== branchId).map((e) => String(e.productId)),
  );

  const merged = products
    .filter((p) => !exclusiveElsewhere.has(String(p._id)))
    .map((p) => {
      const o = overrideByProduct.get(String(p._id));
      return {
        ...p,
        basePrice: o?.priceOverride ?? p.basePrice,
        stock: o?.stock ?? p.stock,
        isAvailable: (o ? o.isAvailable : true) && p.isAvailable,
      };
    })
    // Public menu only surfaces available items (matches previous loadMenu behaviour).
    .filter((p) => p.isAvailable);

  return { categories, products: merged, sections };
}
