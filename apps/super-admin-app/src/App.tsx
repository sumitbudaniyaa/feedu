import { Building2, IndianRupee, TrendingUp, Users } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle, ThemeToggle } from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';

// Placeholder platform data — replaced by the super-admin module in Phase 5.
const restaurants = [
  { name: 'The Copper Kitchen', plan: 'growth', mrr: 4999, status: 'active' },
  { name: 'Brew & Co', plan: 'starter', mrr: 1999, status: 'active' },
  { name: 'Saffron House', plan: 'enterprise', mrr: 12999, status: 'active' },
  { name: 'Noodle Bar', plan: 'trial', mrr: 0, status: 'trialing' },
];

export function App() {
  const totalMrr = restaurants.reduce((s, r) => s + r.mrr, 0);

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
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total MRR" value={formatCurrency(totalMrr)} icon={IndianRupee} />
          <Stat label="Restaurants" value={String(restaurants.length)} icon={Building2} />
          <Stat label="Active staff" value="38" icon={Users} />
          <Stat label="Net growth" value="+14%" icon={TrendingUp} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Restaurants</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {restaurants.map((r) => (
              <div key={r.name} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-sm font-medium">
                    {r.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">{r.plan} plan</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">{formatCurrency(r.mrr)}/mo</span>
                  <Badge variant={r.status === 'active' ? 'success' : 'warning'} className="capitalize">
                    {r.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
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
