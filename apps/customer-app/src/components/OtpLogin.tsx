import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Phone, ShieldCheck } from 'lucide-react';
import { Button, Card, Input, Label } from '@feedo/ui';
import { useRequestOtp, useVerifyOtp, useAuth } from '../lib/api.js';
import { useGuest } from '../store/guest.js';

/** Mobile OTP login. On success, stores the customer session token + guest details. */
export function OtpLogin({ onDone }: { onDone?: () => void }) {
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const setTokens = useAuth((s) => s.setTokens);
  const guest = useGuest();

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [name, setName] = useState(guest.name);
  const [phone, setPhone] = useState(guest.phone);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const phoneValid = /^\d{10}$/.test(phone);

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneValid) return;
    requestOtp.mutate(
      { phone, name: name.trim() || undefined },
      {
        onSuccess: (res) => {
          setDevCode(res.devCode ?? null);
          setStep('code');
          setTimeout(() => codeRef.current?.focus(), 100);
        },
      },
    );
  };

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    verifyOtp.mutate(
      { phone, code },
      {
        onSuccess: (res) => {
          setTokens({ accessToken: res.token, refreshToken: '' });
          guest.save(res.name || name.trim(), res.phone);
          onDone?.();
        },
      },
    );
  };

  return (
    <Card className="overflow-hidden p-6">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
          {step === 'phone' ? <Phone className="h-5 w-5 text-accent" /> : <ShieldCheck className="h-5 w-5 text-accent" />}
        </div>
        <h2 className="mt-4 font-semibold">{step === 'phone' ? 'Sign in to Feedo' : 'Enter the code'}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === 'phone'
            ? 'We’ll text a one-time code to verify your number.'
            : `Sent to ${phone}.`}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === 'phone' ? (
          <motion.form
            key="phone"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            onSubmit={sendCode}
            className="mt-5 space-y-3"
          >
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile number</Label>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
            {requestOtp.error && (
              <p className="text-sm text-destructive">
                {requestOtp.error instanceof Error ? requestOtp.error.message : 'Could not send code'}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={!phoneValid || requestOtp.isPending}>
              {requestOtp.isPending ? 'Sending…' : 'Send code'} <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.form>
        ) : (
          <motion.form
            key="code"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            onSubmit={verify}
            className="mt-5 space-y-3"
          >
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
                Dev mode — your code is <span className="font-mono font-bold text-foreground">{devCode}</span>
              </p>
            )}
            {verifyOtp.error && (
              <p className="text-sm text-destructive">
                {verifyOtp.error instanceof Error ? verifyOtp.error.message : 'Verification failed'}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={code.length !== 6 || verifyOtp.isPending}>
              {verifyOtp.isPending ? 'Verifying…' : 'Verify & continue'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setCode('');
              }}
              className="w-full text-center text-xs text-muted-foreground underline underline-offset-2"
            >
              Change number
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </Card>
  );
}
