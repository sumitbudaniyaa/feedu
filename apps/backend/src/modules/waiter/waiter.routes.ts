import { Router } from 'express';
import { z } from 'zod';
import { SOCKET_EVENTS, rooms } from '@feedo/types';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { validate } from '../../middleware/validate.js';
import { requireFeature } from '../../utils/features.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { getIO } from '../../sockets/index.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant, requireFeature('waiter_system'));

// A waiter accepted a table call → tell the diner help is on the way.
router.post(
  '/attend',
  validate(z.object({ tableName: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const { tableName } = req.body as { tableName: string };
    const io = getIO() as unknown as {
      to: (room: string) => { emit: (event: string, payload: unknown) => void };
    };
    io.to(rooms.restaurant(String(req.branchId))).emit(SOCKET_EVENTS.WAITER_ATTENDING, {
      tableName,
      at: new Date().toISOString(),
    });
    return ok(res, { ok: true });
  }),
);

export default router;
