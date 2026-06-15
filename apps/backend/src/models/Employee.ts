import bcrypt from 'bcryptjs';
import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

/**
 * Feedu's own company staff (the SaaS owner + employees). Kept in a SEPARATE
 * collection from `users` — employees are never tied to a restaurant tenant.
 */
const employeeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    // All Feedu staff are super admins of the platform for now.
    role: { type: String, enum: ['super_admin'], default: 'super_admin' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

employeeSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};
employeeSchema.statics.hashPassword = function (plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
};
employeeSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export type EmployeeDoc = InferSchemaType<typeof employeeSchema> & {
  comparePassword(candidate: string): Promise<boolean>;
};
interface EmployeeModel extends Model<EmployeeDoc> {
  hashPassword(plain: string): Promise<string>;
}

export const Employee = model<EmployeeDoc, EmployeeModel>('Employee', employeeSchema);
