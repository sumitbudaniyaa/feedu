import { Router } from 'express';
import { createSectionSchema, reorderSectionsSchema, updateSectionSchema } from '@feedo/types';
import { Section } from '../../models/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateObjectId } from '../../middleware/params.js';
import { validate } from '../../middleware/validate.js';
import { requireTenant, resolveTenant } from '../../middleware/tenant.js';
import { crud } from '../../utils/crud.js';
import { asyncHandler, ok } from '../../utils/http.js';

const handlers = crud({
  model: Section,
  createSchema: createSectionSchema,
  updateSchema: updateSectionSchema,
  defaultSort: { order: 1, createdAt: 1 },
});

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/', asyncHandler(handlers.list));
router.post('/', authorize('owner', 'manager'), asyncHandler(handlers.create));

// Persist a new display order (drag-and-drop).
router.patch(
  '/reorder',
  authorize('owner', 'manager'),
  validate(reorderSectionsSchema),
  asyncHandler(async (req, res) => {
    const { orderedIds } = req.body as { orderedIds: string[] };
    await Promise.all(
      orderedIds.map((id, index) =>
        Section.updateOne({ _id: id, restaurantId: req.restaurantId }, { order: index }),
      ),
    );
    return ok(res, { orderedIds });
  }),
);

router.get('/:id', validateObjectId(), asyncHandler(handlers.get));
router.patch('/:id', validateObjectId(), authorize('owner', 'manager'), asyncHandler(handlers.update));
router.delete('/:id', validateObjectId(), authorize('owner', 'manager'), asyncHandler(handlers.remove));

export default router;
