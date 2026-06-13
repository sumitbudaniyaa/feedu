import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Label, ThemeToggle } from '@feedo/ui';
import { useAuth, useLogin } from '../lib/api.js';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const isAuthed = useAuth((s) => Boolean(s.tokens?.accessToken));
  if (isAuthed) navigate('/', { replace: true });

  const [email, setEmail] = useState('super@feedo.app');
  const [password, setPassword] = useState('password123');

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
            <span className="text-lg font-bold">F</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Feedo Platform</h1>
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
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
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
  );
}
