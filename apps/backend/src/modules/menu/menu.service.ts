import type { Types } from 'mongoose';
import type { BranchMenuDoc } from '../../models/BranchMenu.js';
import type { ProductDoc } from '../../models/Product.js';
import { BranchMenu, Category, Product, Section } from '../../models/index.js';

interface MenuScope {
  /** Brand that owns the shared catalog. Falls back to branch scope when absent (pre-migration). */
  brandId?: string | null;
  /** The branch whose overrides to apply. */
  branchId: string;
}

type LeanProduct = ProductDoc & { _id: Types.ObjectId };
type LeanOverride = BranchMenuDoc & { _id: Types.ObjectId };

/** A catalog product with this branch's effective price/stock/availability resolved. */
export interface EffectiveOrderProduct {
  product: LeanProduct;
  /** This branch's override row, if one exists (drives where stock is decremented). */
  override: LeanOverride | null;
  basePrice: number;
  stock: number | null;
  isAvailable: boolean;
}

/**
 * Resolve specific catalog products for the order pipeline with this branch's
 * effective price/stock/availability applied (same override semantics as
 * {@link resolveBranchMenu}). Products another branch has claimed as exclusive
 * are omitted. Backward compatible: without a `brandId` the catalog is read by
 * `restaurantId` (legacy single-tenant behaviour).
 */
export async function resolveOrderProducts(
  { brandId, branchId }: MenuScope,
  productIds: string[],
): Promise<Map<string, EffectiveOrderProduct>> {
  const catalogFilter = brandId
    ? { brandId, _id: { $in: productIds } }
    : { restaurantId: branchId, _id: { $in: productIds } };

  const [products, overrides, exclusives] = await Promise.all([
    Product.find(catalogFilter).lean(),
    BranchMenu.find({ branchId, productId: { $in: productIds } }).lean(),
    brandId
      ? BranchMenu.find({ brandId, branchExclusive: true, productId: { $in: productIds } })
          .select('productId branchId')
          .lean()
      : [],
  ]);

  const overrideByProduct = new Map(overrides.map((o) => [String(o.productId), o]));
  const exclusiveElsewhere = new Set(
    exclusives.filter((e) => String(e.branchId) !== branchId).map((e) => String(e.productId)),
  );

  const map = new Map<string, EffectiveOrderProduct>();
  for (const p of products as LeanProduct[]) {
    if (exclusiveElsewhere.has(String(p._id))) continue; // not offered at this branch
    const o = (overrideByProduct.get(String(p._id)) as LeanOverride | undefined) ?? null;
    map.set(String(p._id), {
      product: p,
      override: o,
      basePrice: o?.priceOverride ?? p.basePrice,
      stock: o?.stock ?? p.stock ?? null,
      isAvailable: (o ? o.isAvailable : true) && p.isAvailable,
    });
  }
  return map;
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
