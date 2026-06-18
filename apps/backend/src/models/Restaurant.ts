import { Schema, model, type InferSchemaType } from 'mongoose';

const imageSchema = new Schema({ url: String, alt: String }, { _id: false });

const dayHoursSchema = new Schema(
  { open: String, close: String, closed: { type: Boolean, default: false } },
  { _id: false },
);

const restaurantSchema = new Schema(
  {
    // Tenant the branch belongs to. Optional during Phase 0/1 migration; becomes
    // required once every restaurant has been backfilled with a brand.
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: String,
    cuisineType: { type: [String], default: [] },
    logo: imageSchema,
    banner: imageSchema,
    contactNumber: String,
    address: {
      type: new Schema(
        {
          line1: String,
          line2: String,
          city: String,
          state: String,
          postalCode: String,
          country: { type: String, default: 'India' },
        },
        { _id: false },
      ),
    },
    timings: {
      type: new Schema(
        {
          monday: dayHoursSchema,
          tuesday: dayHoursSchema,
          wednesday: dayHoursSchema,
          thursday: dayHoursSchema,
          friday: dayHoursSchema,
          saturday: dayHoursSchema,
          sunday: dayHoursSchema,
        },
        { _id: false },
      ),
    },
    branding: {
      accent: {
        type: String,
        enum: ['emerald', 'violet', 'blue', 'amber', 'rose', 'slate'],
        default: 'violet',
      },
      themeMode: { type: String, enum: ['dark', 'light'], default: 'dark' },
    },
    tax: {
      gstNumber: String,
      gstPercent: { type: Number, default: 5 },
      inclusive: { type: Boolean, default: false },
    },
    currency: { type: String, default: 'INR' },
    onboarding: {
      completed: { type: Boolean, default: false },
      currentStep: { type: Number, default: 0 },
      progress: { type: Number, default: 0 },
      completedSteps: { type: [String], default: [] },
    },
    isLive: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type RestaurantDoc = InferSchemaType<typeof restaurantSchema>;
export const Restaurant = model('Restaurant', restaurantSchema);
