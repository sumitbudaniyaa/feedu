import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Banknote, CreditCard } from 'lucide-react';
import { Button, Input, Label, cn } from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';
import { useGuest } from '../store/guest.js';

type PaymentMethod = 'razorpay' | 'cash';

interface CheckoutDrawerProps {
  open: boolean;
  total: number;
  submitting: boolean;
  error?: string | null;
  onClose: () => void;
  onProceed: (details: { name: string; phone: string; paymentMethod: PaymentMethod }) => void;
}

/** Bottom sheet that collects guest details + payment method, then places the order. */
export function CheckoutDrawer({ open, total, submitting, error, onClose, onProceed }: CheckoutDrawerProps) {
  const guest = useGuest();
  const [name, setName] = useState(guest.name);
  const [phone, setPhone] = useState(guest.phone);
  const [method, setMethod] = useState<PaymentMethod>('razorpay');
  const [touched, setTouched] = useState(false);

  const nameValid = name.trim().length >= 2;
  const phoneValid = /^\d{10}$/.test(phone);
  const canProceed = nameValid && phoneValid && !submitting;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!canProceed) return;
    // Remember the guest so rewards & past orders auto-load next time.
    guest.save(name.trim(), phone);
    onProceed({ name: name.trim(), phone, paymentMethod: method });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !submitting && onClose()}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl border-t border-border bg-card p-5 pb-7 shadow-elevated"
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
            <h2 className="text-lg font-semibold tracking-tight">Your details</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              We&apos;ll use this to keep you posted on your order.
            </p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
                {touched && !nameValid && (
                  <p className="text-xs text-destructive">Please enter your name.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Mobile number</Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  value={phone}
                  // Keep digits only; cap at 10.
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                />
                {touched && !phoneValid && (
                  <p className="text-xs text-destructive">Enter a valid 10-digit mobile number.</p>
                )}
              </div>

              {/* Payment method */}
              <div className="space-y-1.5">
                <Label>Payment</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'razorpay', label: 'Pay online', icon: CreditCard, hint: 'UPI / card / wallet' },
                      { id: 'cash', label: 'Pay at counter', icon: Banknote, hint: 'Cash on collection' },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon;
                    const active = method === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setMethod(opt.id)}
                        className={cn(
                          'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors',
                          active ? 'border-success bg-success/10' : 'border-border hover:bg-secondary',
                        )}
                      >
                        <Icon className={cn('h-4 w-4', active ? 'text-success' : 'text-muted-foreground')} />
                        <span className="text-sm font-medium">{opt.label}</span>
                        <span className="text-[10px] text-muted-foreground">{opt.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" variant="success" className="h-12 w-full justify-between rounded-xl" disabled={!canProceed}>
                <span>
                  {submitting
                    ? 'Processing…'
                    : method === 'cash'
                      ? 'Place order'
                      : total > 0
                        ? 'Proceed to pay'
                        : 'Place order'}
                </span>
                <span>{formatCurrency(total)}</span>
              </Button>
              {method === 'razorpay' && (
                <p className="text-center text-[11px] text-muted-foreground">Payments secured by Razorpay</p>
              )}
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
