import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

let client: Razorpay | null = null;
if (env.razorpayConfigured) {
  client = new Razorpay({ key_id: env.RAZORPAY_KEY_ID!, key_secret: env.RAZORPAY_KEY_SECRET! });
  logger.info('Razorpay configured');
} else {
  logger.warn('Razorpay keys not set — payments run in demo mode');
}

export interface RazorpayOrderInfo {
  orderId: string;
  amount: number; // in paise
  currency: string;
  keyId: string;
}

/**
 * Create a Razorpay order for the given amount (INR rupees).
 * Returns null when Razorpay isn't configured (demo mode).
 */
export async function createRazorpayOrder(
  amountRupees: number,
  receipt: string,
): Promise<RazorpayOrderInfo | null> {
  if (!client) return null;
  const order = await client.orders.create({
    amount: Math.round(amountRupees * 100),
    currency: 'INR',
    receipt,
  });
  return {
    orderId: order.id,
    amount: Number(order.amount),
    currency: order.currency,
    keyId: env.RAZORPAY_KEY_ID!,
  };
}

/**
 * Verify the Razorpay payment signature.
 * In demo mode (no keys) we accept the payment so the flow is usable locally.
 */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  if (!env.razorpayConfigured) return true; // demo mode
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET!)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest('hex');
  // Constant-time comparison.
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.razorpaySignature));
  } catch {
    return false;
  }
}

export const isDemoMode = () => !env.razorpayConfigured;
