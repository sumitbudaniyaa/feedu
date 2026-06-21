import { connectDatabase, disconnectDatabase } from '../config/db.js';
import {
  Brand,
  BranchMenu,
  Category,
  Customer,
  LoyaltyProgram,
  LoyaltyReward,
  Order,
  Product,
  Redemption,
  Restaurant,
  Section,
  Subscription,
} from '../models/index.js';
import { logger } from '../utils/logger.js';

/**
 * Phase 1 backfill: evolve "1 restaurant = 1 tenant" into "1 brand → branches".
 *
 * For every existing Restaurant (which becomes a Branch) we:
 *   1. ensure a Brand exists (one per restaurant, slug carried over) and link it,
 *   2. stamp `brandId` on all of that branch's brand-shared + denormalised docs,
 *   3. seed a BranchMenu override row per product (inherits current price/stock).
 *
 * Idempotent: only stamps docs still missing `brandId`, and upserts BranchMenu.
 * Safe to run repeatedly. Does NOT change any existing field or unique index.
 */
async function migrate() {
  await connectDatabase();

  const restaurants = await Restaurant.find().lean();
  logger.info(`Migrating ${restaurants.length} restaurant(s) → brands…`);

  let brandsCreated = 0;
  let menuRowsSeeded = 0;

  for (const r of restaurants) {
    const branchId = r._id;

    // 1. Brand (reuse if already linked / already created with this slug).
    let brandId = r.brandId;
    if (!brandId) {
      const existing = await Brand.findOne({ slug: r.slug }).select('_id').lean();
      const brand =
        existing ??
        (await Brand.create({
          ownerId: r.ownerId,
          name: r.name,
          slug: r.slug,
          description: r.description,
          cuisineType: r.cuisineType ?? [],
          branding: r.branding ?? { accent: 'violet', themeMode: 'dark' },
          tax: r.tax ?? { cgstPercent: 2.5, sgstPercent: 2.5, inclusive: false },
          currency: r.currency ?? 'INR',
        }));
      if (!existing) brandsCreated++;
      brandId = brand._id;
      await Restaurant.updateOne({ _id: branchId }, { brandId });
    }

    // 2. Stamp brandId on this branch's docs that don't have it yet.
    const stampFilter = { restaurantId: branchId, brandId: { $exists: false } };
    await Promise.all([
      Product.updateMany(stampFilter, { brandId }),
      Category.updateMany(stampFilter, { brandId }),
      Section.updateMany(stampFilter, { brandId }),
      LoyaltyProgram.updateMany(stampFilter, { brandId }),
      LoyaltyReward.updateMany(stampFilter, { brandId }),
      Order.updateMany(stampFilter, { brandId }),
      Customer.updateMany(stampFilter, { brandId }),
      Redemption.updateMany(stampFilter, { brandId }),
      Subscription.updateMany({ restaurantId: branchId, brandId: { $exists: false } }, { brandId }),
    ]);

    // 3. Seed per-branch menu overrides (inherit current product economics).
    const products = await Product.find({ restaurantId: branchId }).select('isAvailable stock').lean();
    for (const p of products) {
      const res = await BranchMenu.updateOne(
        { branchId, productId: p._id },
        {
          $setOnInsert: {
            brandId,
            branchId,
            productId: p._id,
            priceOverride: null, // inherit brand basePrice
            isAvailable: p.isAvailable ?? true,
            stock: null, // inherit product stock until a branch overrides it
            branchExclusive: false,
          },
        },
        { upsert: true },
      );
      if (res.upsertedCount) menuRowsSeeded++;
    }
  }

  logger.info(`Done. Brands created: ${brandsCreated}, branch-menu rows seeded: ${menuRowsSeeded}.`);
  await disconnectDatabase();
}

migrate().catch((err) => {
  logger.error('Brand migration failed', err);
  process.exit(1);
});
