import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { Brand, Restaurant } from '../models/index.js';
import { logger } from '../utils/logger.js';

/**
 * Migration script to update existing Brand and Restaurant documents.
 * It replaces the single `tax.gstPercent` with `tax.cgstPercent` and `tax.sgstPercent`.
 */
async function migrateGst() {
  await connectDatabase();

  logger.info('Migrating GST fields to CGST and SGST for Brands...');
  const brands = await Brand.find({ 'tax.gstPercent': { $exists: true } });
  let brandUpdates = 0;

  for (const brand of brands) {
    const tax = brand.tax as any;
    if (tax && tax.gstPercent !== undefined) {
      const gst = tax.gstPercent;
      brand.tax = {
        gstNumber: tax.gstNumber,
        cgstPercent: gst / 2,
        sgstPercent: gst / 2,
        inclusive: tax.inclusive,
      } as any;
      
      // We use strict: false or update directly since schema has been changed
      await Brand.updateOne(
        { _id: brand._id },
        { 
          $set: { 
            'tax.cgstPercent': gst / 2,
            'tax.sgstPercent': gst / 2
          },
          $unset: { 'tax.gstPercent': 1 }
        }
      );
      brandUpdates++;
    }
  }

  logger.info(`Migrating GST fields to CGST and SGST for Restaurants...`);
  const restaurants = await Restaurant.find({ 'tax.gstPercent': { $exists: true } });
  let restaurantUpdates = 0;

  for (const restaurant of restaurants) {
    const tax = restaurant.tax as any;
    if (tax && tax.gstPercent !== undefined) {
      const gst = tax.gstPercent;
      
      await Restaurant.updateOne(
        { _id: restaurant._id },
        { 
          $set: { 
            'tax.cgstPercent': gst / 2,
            'tax.sgstPercent': gst / 2
          },
          $unset: { 'tax.gstPercent': 1 }
        }
      );
      restaurantUpdates++;
    }
  }

  logger.info(`Migration complete! Updated ${brandUpdates} brands and ${restaurantUpdates} restaurants.`);
  await disconnectDatabase();
}

migrateGst().catch((err) => {
  logger.error('GST migration failed', err);
  process.exit(1);
});
