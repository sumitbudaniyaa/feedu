import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } });
});

router.use('/auth', authRoutes);

// Phase 2+ modules mount here:
// router.use('/restaurants', restaurantRoutes);
// router.use('/products', productRoutes);
// router.use('/orders', orderRoutes);
// router.use('/sections', sectionRoutes);
// router.use('/loyalty', loyaltyRoutes);
// router.use('/analytics', analyticsRoutes);

export default router;
