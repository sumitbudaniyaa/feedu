import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import categoryRoutes from '../modules/categories/categories.routes.js';
import productRoutes from '../modules/products/products.routes.js';
import sectionRoutes from '../modules/sections/sections.routes.js';
import orderRoutes from '../modules/orders/orders.routes.js';
import loyaltyRoutes from '../modules/loyalty/loyalty.routes.js';
import rewardsRoutes from '../modules/rewards/rewards.routes.js';
import tableRoutes from '../modules/tables/tables.routes.js';
import staffRoutes from '../modules/staff/staff.routes.js';
import restaurantRoutes from '../modules/restaurants/restaurants.routes.js';
import analyticsRoutes from '../modules/analytics/analytics.routes.js';
import customerRoutes from '../modules/customers/customers.routes.js';
import platformRoutes from '../modules/platform/platform.routes.js';
import publicRoutes from '../modules/public/public.routes.js';
import integrationRoutes from '../modules/integrations/integrations.routes.js';
import uploadRoutes from '../modules/uploads/uploads.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } });
});

// Public (customer) — no auth
router.use('/public', publicRoutes);

// Aggregator/middleware order ingestion (secret-gated, not tenant-authed)
router.use('/integrations', integrationRoutes);

// Authenticated, tenant-scoped
router.use('/auth', authRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/sections', sectionRoutes);
router.use('/orders', orderRoutes);
router.use('/loyalty', loyaltyRoutes);
router.use('/rewards', rewardsRoutes);
router.use('/tables', tableRoutes);
router.use('/staff', staffRoutes);
router.use('/customers', customerRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/uploads', uploadRoutes);

// Platform (super admin) — cross-tenant
router.use('/platform', platformRoutes);

export default router;
