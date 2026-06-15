import type { LoginInput, RegisterInput } from '@feedo/types';
import { slugify, randomToken } from '@feedo/utils';
import { Restaurant } from '../../models/Restaurant.js';
import { Subscription } from '../../models/Subscription.js';
import { User } from '../../models/User.js';
import { Employee } from '../../models/Employee.js';
import { ApiError } from '../../utils/ApiError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';

function issueTokens(user: { id: string; role: string; restaurantId: unknown }) {
  const restaurantId = user.restaurantId ? String(user.restaurantId) : null;
  return {
    accessToken: signAccessToken({ sub: user.id, role: user.role, restaurantId }),
    refreshToken: signRefreshToken({ sub: user.id }),
  };
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

  const restaurant = await Restaurant.create({
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
    plan: 'trial',
    status: 'trialing',
    trialEndsAt,
  });

  const tokens = issueTokens({
    id: owner.id,
    role: owner.role,
    restaurantId: owner.restaurantId,
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

  const tokens = issueTokens({ id: user.id, role: user.role, restaurantId: user.restaurantId });
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
    tokens: issueTokens({ id: user.id, role: user.role, restaurantId: user.restaurantId }),
  };
}

export async function me(userId: string) {
  const employee = await Employee.findById(userId);
  if (employee) return employee.toJSON();
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
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
