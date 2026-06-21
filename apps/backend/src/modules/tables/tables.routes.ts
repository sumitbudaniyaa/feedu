import { Router } from 'express';
import { createTableSchema, generateTablesSchema, updateTableStatusSchema, SOCKET_EVENTS, rooms } from '@feedo/types';
import { randomToken } from '@feedo/utils';
import { Table } from '../../models/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateObjectId } from '../../middleware/params.js';
import { validate } from '../../middleware/validate.js';
import { requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { crud } from '../../utils/crud.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { ApiError } from '../../utils/ApiError.js';
import { getIO } from '../../sockets/index.js';

const handlers = crud({
  model: Table,
  defaultSort: { createdAt: 1 },
  searchFields: ['name'],
});

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/', asyncHandler(handlers.list));

router.post(
  '/',
  authorize('owner', 'manager', 'branch_manager'),
  validate(createTableSchema),
  asyncHandler(async (req, res) => {
    const table = await Table.create({
      restaurantId: req.branchId,
      name: req.body.name,
      seats: req.body.seats ?? 2,
      qrToken: randomToken(10),
    });
    return ok(res, table, 201);
  }),
);

// Bulk-generate tables (onboarding). Each gets a unique QR token.
router.post(
  '/generate',
  authorize('owner', 'manager', 'branch_manager'),
  validate(generateTablesSchema),
  asyncHandler(async (req, res) => {
    const { count, prefix } = req.body as { count: number; prefix: string };
    const existing = await Table.countDocuments({ restaurantId: req.branchId });
    const docs = Array.from({ length: count }, (_, i) => ({
      restaurantId: req.branchId,
      name: `${prefix} ${existing + i + 1}`,
      qrToken: randomToken(10),
    }));
    const created = await Table.insertMany(docs);
    return ok(res, created, 201);
  }),
);

// Seat occupancy / reservation — set a table available | occupied | reserved.
// Reservation details are stored only when status === 'reserved'; otherwise cleared.
router.patch(
  '/:id/status',
  validateObjectId(),
  authorize('owner', 'manager', 'branch_manager', 'cashier', 'kitchen_staff', 'waiter'),
  validate(updateTableStatusSchema),
  asyncHandler(async (req, res) => {
    const { status, reservation } = req.body as {
      status: 'available' | 'occupied' | 'reserved';
      reservation?: unknown;
    };
    const table = await Table.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.branchId },
      { status, reservation: status === 'reserved' ? (reservation ?? null) : null },
      { new: true },
    );
    if (!table) throw ApiError.notFound('Table not found');
    // Live-sync the seat grid to every device watching this branch + brand.
    const io = getIO() as unknown as { to: (room: string) => { emit: (e: string, p: unknown) => void } };
    const payload = { tableId: String(table._id) };
    io.to(rooms.restaurant(String(req.branchId))).emit(SOCKET_EVENTS.TABLE_UPDATED, payload);
    if (req.brandId) io.to(rooms.brand(String(req.brandId))).emit(SOCKET_EVENTS.TABLE_UPDATED, payload);
    return ok(res, table);
  }),
);

router.patch('/:id', validateObjectId(), authorize('owner', 'manager', 'branch_manager'), asyncHandler(handlers.update));
router.delete('/:id', validateObjectId(), authorize('owner', 'manager', 'branch_manager'), asyncHandler(handlers.remove));

export default router;
