import { Schema, model, type InferSchemaType } from 'mongoose';

/** Short-lived mobile OTP for customer login. Auto-expires via TTL index. */
const otpSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    name: { type: String },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL: Mongo removes the document once expiresAt passes.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type OtpDoc = InferSchemaType<typeof otpSchema>;
export const Otp = model('Otp', otpSchema);
