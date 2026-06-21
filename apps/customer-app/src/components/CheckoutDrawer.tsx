import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Banknote, CreditCard, ShieldCheck } from 'lucide-react';
import { Button, Input, Label, cn } from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';
import { useAuth, useRequestOtp, useVerifyOtp } from '../lib/api.js';
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

/** Bottom sheet that collects guest details + payment method, then places the order.
 *  Guests who aren't signed in must verify their number with an OTP before ordering. */
export function CheckoutDrawer({ open, total, submitting, error, onClose, onProceed }: CheckoutDrawerProps) {
  const guest = useGuest();
  const isAuthed = useAuth((s) => Boolean(s.tokens?.accessToken));
  const setTokens = useAuth((s) => s.setTokens);
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();

  const [name, setName] = useState(guest.name);
  const [phone, setPhone] = useState(guest.phone);
  const [method, setMethod] = useState<PaymentMethod>('razorpay');
  const [touched, setTouched] = useState(false);

  // OTP sub-flow (guests only).
  const [phase, setPhase] = useState<'details' | 'otp'>('details');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const nameValid = name.trim().length >= 2;
  const phoneValid = /^\d{10}$/.test(phone);
  const detailsValid = nameValid && phoneValid;

  const place = () => {
    // Remember the guest so rewards & past orders auto-load next time.
    guest.save(name.trim(), phone);
    onProceed({ name: name.trim(), phone, paymentMethod: method });
  };

  const submitDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!detailsValid || submitting) return;

    // Already signed in → place the order straight away.
    if (isAuthed) {
      place();
      return;
    }

    // Otherwise verify the number with a one-time code first.
    requestOtp.mutate(
      { phone, name: name.trim() || undefined },
      {
        onSuccess: (res) => {
          setDevCode(res.devCode ?? null);
          setPhase('otp');
          setTimeout(() => codeRef.current?.focus(), 100);
        },
      },
    );
  };

  const submitOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || verifyOtp.isPending) return;
    verifyOtp.mutate(
      { phone, code },
      {
        onSuccess: (res) => {
          setTokens({ accessToken: res.token, refreshToken: '' });
          guest.save(res.name || name.trim(), res.phone);
          place();
        },
      },
    );
  };

  const payLabel = submitting
    ? 'Processing…'
    : method === 'cash'
      ? 'Place order'
      : total > 0
        ? 'Proceed to pay'
        : 'Place order';

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
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                if (!submitting) onClose();
              }
            }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl border-t border-border bg-card p-5 pb-7 shadow-elevated"
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />

            <AnimatePresence mode="wait">
              {phase === 'details' ? (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                >
                  <h2 className="text-lg font-semibold tracking-tight">Your details</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    We&apos;ll use this to keep you posted on your order.
                  </p>

                  <form onSubmit={submitDetails} className="mt-5 space-y-4">
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

                    {!isAuthed && (
                      <p className="text-center text-[11px] text-muted-foreground">
                        We&apos;ll text a one-time code to verify your number.
                      </p>
                    )}
                    {requestOtp.error && (
                      <p className="text-sm text-destructive">
                        {requestOtp.error instanceof Error ? requestOtp.error.message : 'Could not send code'}
                      </p>
                    )}
                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <Button
                      type="submit"
                      variant="success"
                      className="h-12 w-full justify-between rounded-xl"
                      disabled={!detailsValid || submitting || requestOtp.isPending}
                    >
                      <span>{requestOtp.isPending ? 'Sending code…' : isAuthed ? payLabel : 'Verify & continue'}</span>
                      <span>{formatCurrency(total)}</span>
                    </Button>

                    {/* Guests may skip verification — but lose rewards/member benefits. */}
                    {!isAuthed && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setTouched(true);
                            if (detailsValid && !submitting) place();
                          }}
                          disabled={submitting || requestOtp.isPending}
                          className="w-full text-center text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:opacity-60"
                        >
                          {submitting ? 'Placing order…' : 'Continue without verifying'}
                        </button>
                        <p className="rounded-lg bg-secondary/70 p-2 text-center text-[11px] leading-relaxed text-muted-foreground">
                          Heads up: without verifying your number you won&apos;t earn or redeem{' '}
                          <span className="font-medium text-foreground">reward points</span> or unlock member benefits on this order.
                        </p>
                      </>
                    )}
                    {method === 'razorpay' && isAuthed && (
                      <p className="text-center text-[11px] text-muted-foreground">Payments secured by Razorpay</p>
                    )}
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
                      <ShieldCheck className="h-5 w-5 text-accent" />
                    </div>
                    <h2 className="mt-3 text-lg font-semibold tracking-tight">Enter the code</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">Sent to {phone}.</p>
                  </div>

                  <form onSubmit={submitOtp} className="mt-5 space-y-3">
                    <Input
                      ref={codeRef}
                      type="tel"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="6-digit code"
                      className="h-12 text-center text-2xl font-semibold tracking-[0.4em]"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                    {devCode && (
                      <p className="rounded-lg bg-secondary p-2 text-center text-xs text-muted-foreground">
                        Dev mode — your code is{' '}
                        <span className="font-mono font-bold text-foreground">{devCode}</span>
                      </p>
                    )}
                    {verifyOtp.error && (
                      <p className="text-sm text-destructive">
                        {verifyOtp.error instanceof Error ? verifyOtp.error.message : 'Verification failed'}
                      </p>
                    )}
                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <Button
                      type="submit"
                      variant="success"
                      className="h-12 w-full justify-between rounded-xl"
                      disabled={code.length !== 6 || verifyOtp.isPending || submitting}
                    >
                      <span>{verifyOtp.isPending || submitting ? 'Verifying…' : payLabel}</span>
                      <span>{formatCurrency(total)}</span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhase('details');
                        setCode('');
                      }}
                      className="flex w-full items-center justify-center gap-1 text-center text-xs text-muted-foreground underline underline-offset-2"
                    >
                      <ArrowLeft className="h-3 w-3" /> Change number
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
