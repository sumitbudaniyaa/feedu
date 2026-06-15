import type { Request, Response } from 'express';
import type { Model, RootFilterQuery } from 'mongoose';
import type { ZodTypeAny } from 'zod';
import { ApiError } from './ApiError.js';
import { ok } from './http.js';

interface CrudOptions<T> {
  model: Model<T>;
  createSchema?: ZodTypeAny;
  updateSchema?: ZodTypeAny;
  /** Default sort applied to list queries. */
  defaultSort?: Record<string, 1 | -1>;
  /** Fields searched when `?search=` is provided. */
  searchFields?: string[];
  /** Extra filter merged into every query (besides the tenant key). */
  baseFilter?: (req: Request) => RootFilterQuery<T>;
  /**
   * Tenant key the resource is scoped by:
   * - `branch` (default): `restaurantId` = active branch (unchanged behaviour).
   * - `brand`: `brandId` = the tenant (shared resources like menu/loyalty).
   */
  level?: 'brand' | 'branch';
}

/**
 * Generates tenant-scoped CRUD handlers for a Mongoose model. Branch-level
 * resources are constrained to `req.branchId`; brand-level resources to
 * `req.brandId`.
 */
export function crud<T>(opts: CrudOptions<T>) {
  const { model, defaultSort = { createdAt: -1 }, searchFields = [], level = 'branch' } = opts;

  const tenantFilter = (req: Request) =>
    level === 'brand' ? { brandId: req.brandId } : { restaurantId: req.branchId };

  const scope = (req: Request): RootFilterQuery<T> => {
    const base = tenantFilter(req) as RootFilterQuery<T>;
    return opts.baseFilter ? { ...base, ...opts.baseFilter(req) } : base;
  };

  return {
    list: async (req: Request, res: Response) => {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const filter = scope(req) as Record<string, unknown>;

      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      if (search && searchFields.length) {
        filter.$or = searchFields.map((f) => ({ [f]: { $regex: search, $options: 'i' } }));
      }

      const [items, total] = await Promise.all([
        model
          .find(filter)
          .sort(defaultSort)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        model.countDocuments(filter),
      ]);

      return ok(res, items, 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
    },

    get: async (req: Request, res: Response) => {
      const doc = await model.findOne({ ...scope(req), _id: req.params.id } as RootFilterQuery<T>);
      if (!doc) throw ApiError.notFound();
      return ok(res, doc);
    },

    create: async (req: Request, res: Response) => {
      const payload = opts.createSchema ? opts.createSchema.parse(req.body) : req.body;
      // Brand resources are owned by the tenant (brandId); branch resources by
      // the active branch (restaurantId).
      const tenant = level === 'brand' ? { brandId: req.brandId } : { restaurantId: req.branchId };
      const doc = await model.create({ ...payload, ...tenant });
      return ok(res, doc, 201);
    },

    update: async (req: Request, res: Response) => {
      const payload = opts.updateSchema ? opts.updateSchema.parse(req.body) : req.body;
      const doc = await model.findOneAndUpdate(
        { ...scope(req), _id: req.params.id } as RootFilterQuery<T>,
        payload,
        { new: true },
      );
      if (!doc) throw ApiError.notFound();
      return ok(res, doc);
    },

    remove: async (req: Request, res: Response) => {
      const doc = await model.findOneAndDelete({
        ...scope(req),
        _id: req.params.id,
      } as RootFilterQuery<T>);
      if (!doc) throw ApiError.notFound();
      return ok(res, { _id: req.params.id });
    },
  };
}
