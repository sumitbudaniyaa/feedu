import type { Request } from 'express';
import { Product, Restaurant, Table, User } from '../models/index.js';

const STAFF_ROLES = ['owner', 'manager', 'kitchen', 'waiter', 'branch_manager'];

/** Branch ids of the active brand (for brand-wide counts). */
async function brandBranchIds(brandId: string | undefined) {
  if (!brandId) return [];
  return Restaurant.find({ brandId }).distinct('_id');
}

/** Current usage counts for limit enforcement (account/brand-wide where it makes sense). */
export const usage = {
  branches: (req: Request) => Restaurant.countDocuments({ brandId: req.brandId }),
  products: (req: Request) => Product.countDocuments({ brandId: req.brandId }),
  staff: async (req: Request) => {
    const ids = await brandBranchIds(req.brandId);
    return User.countDocuments({ restaurantId: { $in: ids }, role: { $in: STAFF_ROLES } });
  },
  // Tables are per-outlet; cap each branch.
  tables: (req: Request) => Table.countDocuments({ restaurantId: req.branchId }),
};
