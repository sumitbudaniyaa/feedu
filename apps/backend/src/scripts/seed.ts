import { randomToken } from '@feedo/utils';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import {
  Category,
  LoyaltyProgram,
  Product,
  Restaurant,
  Section,
  Subscription,
  Table,
  User,
} from '../models/index.js';
import { logger } from '../utils/logger.js';

/**
 * Idempotent dev seed. Creates the platform super-admin and one fully set-up
 * demo restaurant (menu, tables, a homepage section, a loyalty program) so every
 * app has real, editable data to work against. Everything here can be changed
 * or deleted through the apps — none of it is hardcoded into the UI.
 */
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
      tax: { gstPercent: 5, inclusive: false },
      onboarding: { completed: true, currentStep: 8, progress: 100, completedSteps: [] },
      isLive: true,
    });
    owner.restaurantId = restaurant._id;
    await owner.save();

    // A kitchen staff login so the kitchen app is usable out of the box.
    await User.create({
      name: 'Kitchen Station',
      email: 'kitchen@feedo.app',
      passwordHash: await User.hashPassword('password123'),
      role: 'kitchen',
      restaurantId: restaurant._id,
    });

    await Subscription.create({
      restaurantId: restaurant._id,
      plan: 'growth',
      status: 'active',
      mrr: 4999,
    });

    const cats = await Category.create([
      { restaurantId: restaurant._id, name: 'Mains', order: 0 },
      { restaurantId: restaurant._id, name: 'Starters', order: 1 },
      { restaurantId: restaurant._id, name: 'Drinks', order: 2 },
      { restaurantId: restaurant._id, name: 'Desserts', order: 3 },
    ]);
    const [mains, starters, drinks, desserts] = [cats[0]!, cats[1]!, cats[2]!, cats[3]!];

    const products = await Product.create([
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
        addons: [{ label: 'Extra gravy', price: 40, maxQty: 2 }],
        rating: 4.7,
        ratingCount: 213,
      },
      {
        restaurantId: restaurant._id,
        categoryId: mains._id,
        name: 'Paneer Tikka Masala',
        description: 'Char-grilled paneer in a rich, smoky masala.',
        basePrice: 280,
        isVeg: true,
        rating: 4.6,
        ratingCount: 121,
      },
      {
        restaurantId: restaurant._id,
        categoryId: starters._id,
        name: 'Paneer Tikka',
        description: 'Char-grilled, smoky and spiced.',
        basePrice: 240,
        isVeg: true,
        stock: 25,
        lowStockThreshold: 5,
        rating: 4.5,
        ratingCount: 88,
      },
      {
        restaurantId: restaurant._id,
        categoryId: drinks._id,
        name: 'Masala Chai',
        description: 'Slow-brewed with whole spices.',
        basePrice: 60,
        isVeg: true,
        rating: 4.9,
        ratingCount: 540,
      },
      {
        restaurantId: restaurant._id,
        categoryId: desserts._id,
        name: 'Gulab Jamun',
        description: 'Warm, two pieces, in saffron syrup.',
        basePrice: 90,
        isVeg: true,
        rating: 4.8,
        ratingCount: 167,
      },
    ]);

    await Section.create({
      restaurantId: restaurant._id,
      title: "Today's Best",
      subtitle: 'Loved by our regulars',
      layout: 'carousel',
      productIds: [products[0]!._id, products[3]!._id, products[4]!._id],
      order: 0,
      isActive: true,
    });

    await LoyaltyProgram.create({
      restaurantId: restaurant._id,
      title: 'Copper Rewards',
      type: 'points',
      isActive: true,
      conditions: { pointsPerCurrency: 0.1, pointsToRedeem: 200 },
      rewardDescription: 'Earn 10 points per ₹100 spent — redeem for a free dessert.',
    });

    await Table.insertMany(
      Array.from({ length: 6 }, (_, i) => ({
        restaurantId: restaurant!._id,
        name: `Table ${i + 1}`,
        qrToken: randomToken(10),
        seats: 4,
      })),
    );

    logger.info('Created demo restaurant "The Copper Kitchen"');
    logger.info('  Owner:   owner@feedo.app / password123');
    logger.info('  Kitchen: kitchen@feedo.app / password123');
  }

  await disconnectDatabase();
  logger.info('Seed complete.');
}

seed().catch((err) => {
  logger.error('Seed failed', err);
  process.exit(1);
});
