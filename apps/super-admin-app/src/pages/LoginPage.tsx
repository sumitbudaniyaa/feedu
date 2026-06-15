import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button, Input, Label, ThemeToggle } from '@feedo/ui';
import { useAuth, useLogin } from '../lib/api.js';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const isAuthed = useAuth((s) => Boolean(s.tokens?.accessToken));
  if (isAuthed) navigate('/', { replace: true });

  const [email, setEmail] = useState('super@feedo.app');
  const [password, setPassword] = useState('password123');
  const [show, setShow] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left brand banner */}
      <div
        className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 text-white lg:flex"
        style={{
          background:
            'linear-gradient(150deg, hsl(var(--accent)), hsl(var(--accent) / 0.7) 60%, hsl(var(--accent) / 0.5))',
        }}
      >
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-black/10 blur-3xl" />
        <span className="relative text-3xl font-black italic tracking-tight">feedo</span>
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">The Feedo platform console</h2>
          <p className="mt-3 max-w-sm text-white/85">
            Onboard restaurants, manage subscriptions, and watch the whole business in one place.
          </p>
        </div>
        <p className="relative text-sm text-white/70">Restricted · super admin access only</p>
      </div>

      {/* Right login form */}
      <div className="relative flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="text-3xl font-black italic tracking-tight text-foreground lg:hidden">feedo</span>
            <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold tracking-tight">
              <ShieldCheck className="h-5 w-5 text-accent" /> Platform sign in
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Super admin access only</p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              login.mutate({ email, password }, { onSuccess: () => navigate('/', { replace: true }) });
            }}
          >
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {login.error && (
              <p className="text-sm text-destructive">
                {login.error instanceof Error ? login.error.message : 'Login failed'}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
