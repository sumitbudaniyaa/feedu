import type { LoginInput, RegisterInput } from '@feedo/types';
import { slugify, randomToken } from '@feedo/utils';
import { Brand } from '../../models/Brand.js';
import { Restaurant } from '../../models/Restaurant.js';
import { Subscription } from '../../models/Subscription.js';
import { User } from '../../models/User.js';
import { Employee } from '../../models/Employee.js';
import { ApiError } from '../../utils/ApiError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';

/** Brand-wide roles see every branch of their brand; others are scoped to their branch. */
const BRAND_WIDE_ROLES = new Set(['owner', 'brand_owner', 'brand_admin']);

function issueTokens(user: {
  id: string;
  role: string;
  restaurantId: unknown;
  brandId?: string | null;
  branchIds?: string[];
}) {
  const restaurantId = user.restaurantId ? String(user.restaurantId) : null;
  return {
    accessToken: signAccessToken({
      sub: user.id,
      role: user.role,
      restaurantId,
      brandId: user.brandId ?? null,
      branchIds: user.branchIds ?? (restaurantId ? [restaurantId] : []),
    }),
    refreshToken: signRefreshToken({ sub: user.id }),
  };
}

/** Resolve a restaurant user's brand + accessible branches for token issuance. */
async function brandContext(role: string, restaurantId: unknown) {
  if (!restaurantId) return { brandId: null, branchIds: [] as string[] };
  const branchId = String(restaurantId);
  const branch = await Restaurant.findById(branchId).select('brandId').lean();
  const brandId = branch?.brandId ? String(branch.brandId) : null;
  let branchIds = [branchId];
  if (brandId && BRAND_WIDE_ROLES.has(role)) {
    const all = await Restaurant.find({ brandId }).select('_id').lean();
    branchIds = all.map((r) => String(r._id));
  }
  return { brandId, branchIds };
}

/** Issue tokens for a restaurant user, including brand/branch context. */
async function userTokens(user: { id: string; role: string; restaurantId: unknown }) {
  const { brandId, branchIds } = await brandContext(user.role, user.restaurantId);
  return issueTokens({ ...user, brandId, branchIds });
}

/** Owner self-signup: creates user + restaurant shell + trial subscription. */
export async function register(input: RegisterInput) {
  const existing = await User.findOne({ email: input.email, restaurantId: null });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await User.hashPassword(input.password);

  // Generate a unique slug for the restaurant.
  let slug = slugify(input.restaurantName);
  if (await Restaurant.exists({ slug })) slug = `${slug}-${randomToken(3)}`;

  const owner = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: 'owner',
  });

  // A self-signup creates a brand (tenant) with its first branch.
  const brand = await Brand.create({ ownerId: owner._id, name: input.restaurantName, slug });

  const restaurant = await Restaurant.create({
    brandId: brand._id,
    ownerId: owner._id,
    name: input.restaurantName,
    slug,
    onboarding: { completed: false, currentStep: 0, progress: 0, completedSteps: [] },
  });

  owner.restaurantId = restaurant._id;
  await owner.save();

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await Subscription.create({
    restaurantId: restaurant._id,
    brandId: brand._id,
    plan: 'trial',
    status: 'trialing',
    trialEndsAt,
  });

  const tokens = issueTokens({
    id: owner.id,
    role: owner.role,
    restaurantId: owner.restaurantId,
    brandId: String(brand._id),
    branchIds: [String(restaurant._id)],
  });
  return { user: owner.toJSON(), tokens, restaurant: restaurant.toJSON() };
}

export async function login(input: LoginInput) {
  // Feedu employees live in their own collection — check it first (no tenant).
  const employee = await Employee.findOne({ email: input.email }).select('+passwordHash');
  if (employee) {
    if (!employee.isActive || !(await employee.comparePassword(input.password))) {
      throw ApiError.unauthorized('Invalid credentials');
    }
    employee.lastLoginAt = new Date();
    await employee.save();
    return {
      user: employee.toJSON(),
      tokens: issueTokens({ id: employee.id, role: 'super_admin', restaurantId: null }),
    };
  }

  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid credentials');

  const valid = await user.comparePassword(input.password);
  if (!valid) throw ApiError.unauthorized('Invalid credentials');

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await userTokens({ id: user.id, role: user.role, restaurantId: user.restaurantId });
  return { user: user.toJSON(), tokens };
}

export async function refresh(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }
  const employee = await Employee.findById(payload.sub);
  if (employee) {
    if (!employee.isActive) throw ApiError.unauthorized('Account not found');
    return {
      user: employee.toJSON(),
      tokens: issueTokens({ id: employee.id, role: 'super_admin', restaurantId: null }),
    };
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account not found');

  return {
    user: user.toJSON(),
    tokens: await userTokens({ id: user.id, role: user.role, restaurantId: user.restaurantId }),
  };
}

export async function me(userId: string) {
  const employee = await Employee.findById(userId);
  if (employee) return employee.toJSON();
  const user = await User.findById(userId);
  // A valid token whose account no longer exists (e.g. the brand/restaurant was
  // deleted from the super-admin) is an auth failure, not a 404 — return 401 so the
  // client attempts a refresh, that also fails, and the stale session logs out.
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  return user.toJSON();
}

/** Change the signed-in account's password (verifies the current one first). */
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  if (!newPassword || newPassword.length < 8) {
    throw ApiError.badRequest('New password must be at least 8 characters');
  }
  // Works for both Feedu employees and restaurant users.
  const account =
    (await Employee.findById(userId).select('+passwordHash')) ??
    (await User.findById(userId).select('+passwordHash'));
  if (!account) throw ApiError.notFound('Account not found');
  if (!(await account.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  // Both models hash identically (bcrypt cost 12).
  account.passwordHash = await User.hashPassword(newPassword);
  await account.save();
  return { changed: true };
}
