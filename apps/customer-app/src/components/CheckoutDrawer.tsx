import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, Input, Label } from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';

interface CheckoutDrawerProps {
  open: boolean;
  total: number;
  submitting: boolean;
  error?: string | null;
  onClose: () => void;
  onProceed: (details: { name: string; phone: string }) => void;
}

/** Bottom sheet that collects guest details, then initiates payment. */
export function CheckoutDrawer({ open, total, submitting, error, onClose, onProceed }: CheckoutDrawerProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);

  const nameValid = name.trim().length >= 2;
  const phoneValid = /^\d{10}$/.test(phone);
  const canProceed = nameValid && phoneValid && !submitting;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!canProceed) return;
    onProceed({ name: name.trim(), phone });
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

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" variant="accent" className="h-12 w-full justify-between rounded-xl" disabled={!canProceed}>
                <span>{submitting ? 'Processing…' : 'Proceed to pay'}</span>
                <span>{formatCurrency(total)}</span>
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">Payments secured by Razorpay</p>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
