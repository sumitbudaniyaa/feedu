import { Building2, IndianRupee, LogOut, Power, TrendingUp, Users } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  ThemeToggle,
} from '@feedo/ui';
import { formatCurrency, formatDate } from '@feedo/utils';
import { useStats, useRestaurants, useToggleLive, useAuth, useLogin, useLogout } from './lib/api.js';

export function App() {
  const isAuthed = useAuth((s) => Boolean(s.tokens?.accessToken));
  return isAuthed ? <Console /> : <Login />;
}

function Console() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: restaurants, isLoading } = useRestaurants();
  const toggleLive = useToggleLive();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
            <span className="text-sm font-bold">F</span>
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Feedo Platform</h1>
            <p className="text-xs text-muted-foreground">Internal console</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsLoading || !stats ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : (
            <>
              <Stat label="Total MRR" value={formatCurrency(stats.totalMrr)} icon={IndianRupee} />
              <Stat label="Restaurants" value={String(stats.restaurants)} icon={Building2} />
              <Stat label="Active staff" value={String(stats.activeStaff)} icon={Users} />
              <Stat label="Active subs" value={String(stats.activeSubscriptions)} icon={TrendingUp} />
            </>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Restaurants</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : restaurants && restaurants.length > 0 ? (
              <div className="divide-y divide-border">
                {restaurants.map((r) => (
                  <div key={r._id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-sm font-medium">
                        {r.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.orderCount} orders · joined {formatDate(r.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">
                        {formatCurrency(r.subscription?.mrr ?? 0)}/mo
                      </span>
                      <Badge variant="outline" className="capitalize">
                        {r.subscription?.plan ?? 'none'}
                      </Badge>
                      <Badge variant={r.isLive ? 'success' : 'warning'}>
                        {r.isLive ? 'Live' : 'Offline'}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        title={r.isLive ? 'Suspend' : 'Reactivate'}
                        onClick={() => toggleLive.mutate({ id: r._id, isLive: !r.isLive })}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8">
                <EmptyState icon={Building2} title="No restaurants yet" />
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function Login() {
  const login = useLogin();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        className="w-full max-w-sm space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          login.mutate({ email: String(fd.get('email')), password: String(fd.get('password')) });
        }}
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
            <span className="text-lg font-bold">F</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Feedo Platform</h1>
          <p className="text-sm text-muted-foreground">Super admin access only</p>
        </div>
        <input name="email" type="email" placeholder="Email" required className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <input name="password" type="password" placeholder="Password" required className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        {login.error && <p className="text-sm text-destructive">{login.error instanceof Error ? login.error.message : 'Login failed'}</p>}
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
