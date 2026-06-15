import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ThemeToggle,
} from '@feedo/ui';
import { useAuth, useLogin, useRegister } from '../lib/api.js';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const register = useRegister();
  const isAuthed = useAuth((s) => Boolean(s.tokens?.accessToken));
  if (isAuthed) navigate('/', { replace: true });

  const [email, setEmail] = useState('owner@feedo.app');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [show, setShow] = useState(false);

  const error = login.error ?? register.error;

  const onLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password }, { onSuccess: () => navigate('/', { replace: true }) });
  };
  const onRegister = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate(
      { name, email, password, restaurantName },
      { onSuccess: () => navigate('/', { replace: true }) },
    );
  };

  const PasswordField = (
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
  );

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
        <span className="relative text-3xl font-black italic tracking-tight">feedu</span>
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">Your restaurant, beautifully run.</h2>
          <p className="mt-3 max-w-sm text-white/85">
            Orders, menu, inventory, loyalty and analytics — all in one calm, fast dashboard.
          </p>
        </div>
        <p className="relative text-sm text-white/70">feedu for restaurants</p>
      </div>

      {/* Right auth form */}
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
            <span className="text-3xl font-black italic tracking-tight text-foreground lg:hidden">feedu</span>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to manage your restaurant.</p>
          </div>

          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="register">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={onLogin} className="space-y-4">
                <Field label="Email">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </Field>
                <Field label="Password">{PasswordField}</Field>
                {error && <ErrorText error={error} />}
                <Button className="w-full" type="submit" disabled={login.isPending}>
                  {login.isPending ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={onRegister} className="space-y-4">
                <Field label="Your name">
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </Field>
                <Field label="Restaurant name">
                  <Input
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Email">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </Field>
                <Field label="Password">{PasswordField}</Field>
                {error && <ErrorText error={error} />}
                <Button className="w-full" type="submit" disabled={register.isPending}>
                  {register.isPending ? 'Creating…' : 'Create account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ErrorText({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Something went wrong';
  return <p className="text-sm text-destructive">{message}</p>;
}
