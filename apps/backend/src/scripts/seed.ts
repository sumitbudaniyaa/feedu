import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { Category, Product, Restaurant, Subscription, User } from '../models/index.js';
import { logger } from '../utils/logger.js';

/** Idempotent dev seed: super-admin + one demo restaurant with a small menu. */
async function seed() {
  await connectDatabase();

  const superEmail = 'super@feedo.app';
  if (!(await User.exists({ email: superEmail }))) {
    await User.create({
      name: 'Feedo Super Admin',
      email: superEmail,
      passwordHash: await User.hashPassword('password123'),
      role: 'super_admin',
    });
    logger.info(`Created super admin (${superEmail} / password123)`);
  }

  const ownerEmail = 'owner@feedo.app';
  let restaurant = await Restaurant.findOne({ slug: 'the-copper-kitchen' });
  if (!restaurant) {
    const owner = await User.create({
      name: 'Aanya Mehta',
      email: ownerEmail,
      passwordHash: await User.hashPassword('password123'),
      role: 'owner',
    });
    restaurant = await Restaurant.create({
      ownerId: owner._id,
      name: 'The Copper Kitchen',
      slug: 'the-copper-kitchen',
      description: 'Modern Indian comfort food.',
      cuisineType: ['Indian', 'Continental'],
      branding: { accent: 'amber', themeMode: 'dark' },
      onboarding: { completed: true, currentStep: 8, progress: 100, completedSteps: [] },
      isLive: true,
    });
    owner.restaurantId = restaurant._id;
    await owner.save();
    await Subscription.create({
      restaurantId: restaurant._id,
      plan: 'growth',
      status: 'active',
      mrr: 4999,
    });

    const mains = await Category.create({
      restaurantId: restaurant._id,
      name: 'Mains',
      order: 0,
    });
    const drinks = await Category.create({
      restaurantId: restaurant._id,
      name: 'Drinks',
      order: 1,
    });
    await Product.create([
      {
        restaurantId: restaurant._id,
        categoryId: mains._id,
        name: 'Butter Chicken',
        description: 'Slow-cooked in a velvety tomato gravy.',
        basePrice: 320,
        isVeg: false,
        variants: [
          { label: 'Half', price: 320 },
          { label: 'Full', price: 540 },
        ],
        rating: 4.7,
        ratingCount: 213,
      },
      {
        restaurantId: restaurant._id,
        categoryId: drinks._id,
        name: 'Masala Chai',
        basePrice: 60,
        isVeg: true,
        rating: 4.9,
        ratingCount: 540,
      },
    ]);
    logger.info(`Created demo restaurant "The Copper Kitchen" (${ownerEmail} / password123)`);
  }

  await disconnectDatabase();
  logger.info('Seed complete.');
}

seed().catch((err) => {
  logger.error('Seed failed', err);
  process.exit(1);
});
