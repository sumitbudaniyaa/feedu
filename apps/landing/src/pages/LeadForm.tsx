import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { ButtonPrimary, cx } from '../components/primitives.js';
import { submitLead, type LeadInput } from '../lib/api.js';
import { EASE } from '../lib/anim.js';

type Field = { key: keyof LeadInput; label: string; type?: string; required?: boolean; placeholder?: string; textarea?: boolean };

const FIELDS: Field[] = [
  { key: 'name', label: 'Your name', required: true, placeholder: 'Rahul Sharma' },
  { key: 'email', label: 'Work email', type: 'email', required: true, placeholder: 'you@restaurant.com' },
  { key: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '10-digit mobile' },
  { key: 'restaurantName', label: 'Restaurant name', placeholder: 'Spicebox' },
  { key: 'city', label: 'City', placeholder: 'Mumbai' },
  { key: 'message', label: 'Anything we should know?', textarea: true, placeholder: 'Number of outlets, what you’re looking for…' },
];

export function LeadForm() {
  const [form, setForm] = useState<LeadInput>({ name: '', email: '', phone: '', type: 'sales' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof LeadInput, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && form.phone.trim().length >= 6;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || status === 'loading') return;
    setStatus('loading');
    setError(null);
    try {
      await submitLead({ ...form, type: 'sales' });
      setStatus('done');
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6 sm:px-8">
        <Link to="/" className="text-2xl font-black italic tracking-tight">
          feedu
        </Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-24 pt-8 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Contact sales
          </span>
          <h1 className="font-display mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Let’s talk about <span className="text-accent">your restaurant.</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Share your details and our team will reach out to help you get started.
          </p>
        </motion.div>

        {status === 'done' ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-warm mt-10 flex flex-col items-center rounded-3xl p-10 text-center"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Check className="h-7 w-7" />
            </span>
            <h2 className="font-display mt-5 text-2xl font-semibold">Thank you, {form.name.split(' ')[0]}!</h2>
            <p className="mt-2 max-w-sm text-muted-foreground">
              We’ve received your enquiry. Our team will be in touch shortly.
            </p>
            <Link to="/" className="mt-6">
              <ButtonPrimary>Back to home</ButtonPrimary>
            </Link>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
            onSubmit={onSubmit}
            className="card-warm mt-10 space-y-5 rounded-3xl p-6 sm:p-8"
          >
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-sm font-medium">
                  {f.label}
                  {f.required && <span className="text-accent"> *</span>}
                </label>
                {f.textarea ? (
                  <textarea
                    value={form[f.key] ?? ''}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
                  />
                ) : (
                  <input
                    type={f.type ?? 'text'}
                    value={form[f.key] ?? ''}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
                  />
                )}
              </div>
            ))}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={!valid || status === 'loading'}
              className={cx(
                'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm font-semibold text-background transition-opacity',
                (!valid || status === 'loading') && 'opacity-50',
              )}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                </>
              ) : (
                'Contact sales'
              )}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              We’ll only use your details to contact you about Feedu.
            </p>
          </motion.form>
        )}
      </main>
    </div>
  );
}
