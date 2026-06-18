import type { NextFunction, Request, Response } from 'express';
import { CORE_FEATURE_KEYS, FEATURE_KEYS, type LimitKey } from '@feedo/types';
import { Restaurant } from '../models/index.js';
import { ApiError } from './ApiError.js';
import { findEffectiveSubscription } from './subscription.js';

type FlagMap = Map<string, boolean> | Record<string, boolean> | undefined | null;

function entriesOf(map: FlagMap): [string, boolean][] {
  if (!map) return [];
  return map instanceof Map ? [...map.entries()] : Object.entries(map);
}

/**
 * Enabled feature keys for a brand. Brands with NO feature set are grandfathered
 * to all-features-on (back-compat for everything onboarded before dynamic
 * pricing). Core features are always on.
 */
export async function resolveBrandFeatures(
  branchId: string | undefined,
  brandId: string | undefined | null,
): Promise<Set<string>> {
  const sub = await findEffectiveSubscription(branchId, brandId);
  const entries = entriesOf(sub?.features as FlagMap);
  if (entries.length === 0) return new Set(FEATURE_KEYS); // grandfathered
  const enabled = new Set(entries.filter(([, v]) => v).map(([k]) => k));
  CORE_FEATURE_KEYS.forEach((k) => enabled.add(k));
  return enabled;
}

/** Brand features minus this branch's overrides (a branch may disable, not add). */
export async function resolveBranchFeatures(
  branchId: string | undefined,
  brandId: string | undefined | null,
): Promise<Set<string>> {
  const features = await resolveBrandFeatures(branchId, brandId);
  if (!branchId) return features;
  const branch = await Restaurant.findById(branchId).select('featureOverrides').lean();
  for (const [k, v] of entriesOf(branch?.featureOverrides as FlagMap)) {
    if (v === false && !CORE_FEATURE_KEYS.includes(k)) features.delete(k);
  }
  return features;
}

/** Cache the resolved feature set on the request (one DB read per request). */
async function featuresFor(req: Request): Promise<Set<string>> {
  const cached = (req as Request & { _features?: Set<string> })._features;
  if (cached) return cached;
  const feats = await resolveBranchFeatures(req.branchId, req.brandId);
  (req as Request & { _features?: Set<string> })._features = feats;
  return feats;
}

/** Route guard: 403 unless the active brand/branch has the feature. super_admin bypasses. */
export function requireFeature(key: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.auth?.role === 'super_admin') return next();
      const feats = await featuresFor(req);
      if (!feats.has(key)) return next(ApiError.forbidden(`This plan doesn't include "${key}"`));
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Route guard: 403 when a usage limit is reached. The super-admin (who sets the
 * limits) bypasses — raising the limit is the override path.
 */
export function enforceLimit(key: LimitKey, count: (req: Request) => Promise<number>) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.auth?.role === 'super_admin') return next();
      const sub = await findEffectiveSubscription(req.branchId, req.brandId);
      const lim = sub?.limits as Map<string, number> | Record<string, number> | undefined | null;
      const limit = lim ? (lim instanceof Map ? lim.get(key) : lim[key]) ?? null : null;
      if (limit == null) return next(); // unlimited
      const current = await count(req);
      if (current >= limit) {
        return next(ApiError.forbidden(`Limit reached for ${key} (${limit}). Contact Feedu to raise it.`));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
