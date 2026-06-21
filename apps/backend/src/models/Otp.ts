import { Schema, model, type InferSchemaType } from 'mongoose';

/** Short-lived mobile OTP for customer login. Auto-expires via TTL index. */
const otpSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    name: { type: String },
    attempts: { type: Number, default: 0 },
    /** When the current code stops being valid (checked on verify). */
    codeExpiresAt: { type: Date, required: true },
    /** Earliest time a new code may be requested for this number (resend cooldown). */
    resendAt: { type: Date },
    /** Per-phone send counter within the current rolling window (SMS-cost guard). */
    sentCount: { type: Number, default: 0 },
    windowStartAt: { type: Date },
    /** TTL field — set past both the code expiry and the rate window so the
        per-phone counters survive long enough to be enforced, then auto-clean. */
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL: Mongo removes the document once expiresAt passes.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type OtpDoc = InferSchemaType<typeof otpSchema>;
export const Otp = model('Otp', otpSchema);
