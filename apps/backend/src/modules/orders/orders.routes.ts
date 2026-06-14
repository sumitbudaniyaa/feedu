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
    const result = await orders.listOrders(req.restaurantId!, {
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
  authorize('owner', 'manager', 'waiter'),
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    // Staff orders are taken in person → confirmed immediately (payment collected at counter).
    const order = await orders.createOrder({
      restaurantId: req.restaurantId!,
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
  asyncHandler(async (req, res) => ok(res, await orders.getOrder(req.restaurantId!, req.params.id!))),
);

// Record a manual payment (admin marks an unpaid order paid, choosing the method).
router.patch(
  '/:id/payment',
  validateObjectId(),
  authorize('owner', 'manager', 'waiter'),
  validate(z.object({ method: manualPaymentMethodSchema })),
  asyncHandler(async (req, res) => {
    const order = await orders.recordPayment(req.restaurantId!, req.params.id!, req.body.method);
    return ok(res, order);
  }),
);

router.patch(
  '/:id/status',
  validateObjectId(),
  authorize('owner', 'manager', 'kitchen', 'waiter'),
  validate(updateOrderStatusSchema),
  asyncHandler(async (req, res) => {
    const order = await orders.updateStatus(req.restaurantId!, req.params.id!, req.body.status);
    return ok(res, order);
  }),
);

export default router;
