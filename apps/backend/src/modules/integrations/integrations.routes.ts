import { Router } from 'express';
import { z } from 'zod';
import { Restaurant } from '../../models/index.js';
import { validate } from '../../middleware/validate.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, ok } from '../../utils/http.js';
import * as orders from '../orders/orders.service.js';

/**
 * Inbound order ingestion for delivery aggregators (Zomato / Swiggy / District)
 * or middleware (UrbanPiper, Petpooja, …). These orders are already PAID on the
 * platform — we just record them so every channel lands in one kitchen + dashboard.
 *
 * Secured by a shared secret (`x-integration-secret` = INTEGRATION_SECRET). The
 * integrator is expected to map their menu to our product ids (real partner APIs
 * exchange a SKU mapping during onboarding).
 */
const PROVIDERS = ['zomato', 'swiggy', 'district'] as const;

const ingestSchema = z.object({
  restaurantSlug: z.string().min(1),
  externalRef: z.string().optional(),
  type: z.enum(['dine_in', 'takeaway']).default('takeaway'),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1) })).min(1),
  customer: z.object({ name: z.string().optional(), phone: z.string().optional() }).optional(),
  notes: z.string().optional(),
});

const router = Router();

router.post(
  '/:provider/orders',
  validate(ingestSchema),
  asyncHandler(async (req, res) => {
    const provider = req.params.provider as (typeof PROVIDERS)[number];
    if (!PROVIDERS.includes(provider)) throw ApiError.badRequest('Unknown provider');

    // Secret gate.
    if (!env.INTEGRATION_SECRET) {
      if (env.isProd) throw ApiError.forbidden('Integrations not configured');
    } else if (req.header('x-integration-secret') !== env.INTEGRATION_SECRET) {
      throw ApiError.unauthorized('Invalid integration secret');
    }

    const body = req.body as z.infer<typeof ingestSchema>;
    const restaurant = await Restaurant.findOne({ slug: body.restaurantSlug }).lean();
    if (!restaurant) throw ApiError.notFound('Restaurant not found');

    const order = await orders.createOrder({
      restaurantId: String(restaurant._id),
      input: {
        type: body.type,
        items: body.items.map((i) => ({ productId: i.productId, quantity: i.quantity, addonLabels: [] })),
        notes: body.notes ? `[${provider}] ${body.notes}` : `[${provider}] ${body.externalRef ?? ''}`.trim(),
      },
      customer: body.customer,
      channel: provider,
      silent: true,
    });

    // Aggregator orders are pre-paid on the platform → confirm + surface immediately.
    const finalized = await orders.finalizeOrder(String(order._id), { paid: true });
    return ok(res, finalized, 201);
  }),
);

export default router;
