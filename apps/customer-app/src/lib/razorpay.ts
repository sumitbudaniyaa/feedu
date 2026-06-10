/** Lazy-load the Razorpay Checkout script (only when needed). */
let loaderPromise: Promise<boolean> | null = null;

export function loadRazorpay(): Promise<boolean> {
  if (typeof window !== 'undefined' && 'Razorpay' in window) return Promise.resolve(true);
  loaderPromise ??= new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  return loaderPromise;
}

export interface RazorpayHandlerResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; contact?: string; email?: string };
  theme?: { color?: string };
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: { ondismiss?: () => void };
}

/** Open the Razorpay checkout modal. */
export function openRazorpay(options: RazorpayOptions) {
  const Ctor = (window as unknown as { Razorpay: new (o: RazorpayOptions) => { open: () => void } })
    .Razorpay;
  new Ctor(options).open();
}
