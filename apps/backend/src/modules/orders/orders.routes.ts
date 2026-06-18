import { Router } from 'express';
import { z } from 'zod';
import { createOrderSchema, manualPaymentMethodSchema, updateOrderStatusSchema } from '@feedo/types';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateObjectId } from '../../middleware/params.js';
import { validate } from '../../middleware/validate.js';
import { requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { asyncHandler, ok } from '../../utils/http.js';
import * as orders from './orders.service.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await orders.listOrders(req.branchId!, {
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      active: req.query.active === 'true',
      page: Number(req.query.page) || undefined,
      limit: Number(req.query.limit) || undefined,
    });
    return ok(res, result.items, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),
);

// Staff-created order (e.g. dine-in taken at the counter).
router.post(
  '/',
  authorize('owner', 'manager', 'waiter', 'branch_manager'),
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    // Staff orders are taken in person → confirmed immediately (payment collected at counter).
    const order = await orders.createOrder({
      restaurantId: req.branchId!,
      input: req.body,
      autoConfirm: true,
      paymentMethod: 'cash',
      channel: 'counter',
    });
    return ok(res, order, 201);
  }),
);

router.get(
  '/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => ok(res, await orders.getOrder(req.branchId!, req.params.id!))),
);

// Record a manual payment (admin marks an unpaid order paid). Accepts a single
// `method`, or `splits` (e.g. part cash + part UPI) that must sum to the total.
router.patch(
  '/:id/payment',
  validateObjectId(),
  authorize('owner', 'manager', 'waiter', 'branch_manager'),
  validate(
    z
      .object({
        method: manualPaymentMethodSchema.optional(),
        splits: z
          .array(z.object({ method: manualPaymentMethodSchema, amount: z.number().positive() }))
          .min(1)
          .optional(),
      })
      .refine((b) => b.method || (b.splits && b.splits.length), {
        message: 'Provide a method or at least one split',
      }),
  ),
  asyncHandler(async (req, res) => {
    const { method, splits } = req.body as {
      method?: 'cash' | 'upi' | 'card' | 'zomato' | 'swiggy' | 'district';
      splits?: { method: 'cash' | 'upi' | 'card' | 'zomato' | 'swiggy' | 'district'; amount: number }[];
    };
    const order = await orders.recordPayment(req.branchId!, req.params.id!, { method, splits });
    return ok(res, order);
  }),
);

router.patch(
  '/:id/status',
  validateObjectId(),
  authorize('owner', 'manager', 'kitchen', 'waiter', 'branch_manager'),
  validate(updateOrderStatusSchema),
  asyncHandler(async (req, res) => {
    const order = await orders.updateStatus(req.branchId!, req.params.id!, req.body.status);
    return ok(res, order);
  }),
);

export default router;
