import bcrypt from 'bcryptjs';
import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: [
        'super_admin',
        // Multi-branch roles.
        'brand_owner',
        'brand_admin',
        'branch_manager',
        'kitchen_staff',
        'cashier',
        // Legacy roles (kept for back-compat).
        'owner',
        'manager',
        'kitchen',
        'waiter',
        'customer',
      ],
      required: true,
      index: true,
    },
    /** Brand (tenant) the user belongs to; set for restaurant users in the multi-branch model. */
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', default: null, index: true },
    avatar: { type: String },
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

// A user's email is unique within their tenant (or globally for null tenant).
userSchema.index({ email: 1, restaurantId: 1 }, { unique: true });

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.statics.hashPassword = function (plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
};

// Strip sensitive fields from JSON output.
userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export type UserDoc = InferSchemaType<typeof userSchema> & {
  comparePassword(candidate: string): Promise<boolean>;
};
interface UserModel extends Model<UserDoc> {
  hashPassword(plain: string): Promise<string>;
}

export const User = model<UserDoc, UserModel>('User', userSchema);
