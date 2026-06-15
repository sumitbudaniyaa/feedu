import { useState } from 'react';
import { ArrowLeft, Building2, ChevronRight, Search, Sparkles, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, Badge, Card, EmptyState, Input, Skeleton } from '@feedo/ui';
import { formatCurrency, formatDate, initials } from '@feedo/utils';
import type { PlatformRestaurant } from '@feedo/api';
import { useAllCustomers, useRestaurants } from '../lib/api.js';
import { CustomerAnalyticsDialog } from '../components/CustomerAnalyticsDialog.js';

export function CustomersPage() {
  const [restaurant, setRestaurant] = useState<PlatformRestaurant | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {restaurant ? `Diners at ${restaurant.name}.` : 'Pick a restaurant to see its diners.'}
        </p>
      </div>

      {restaurant ? (
        <RestaurantCustomers restaurant={restaurant} onBack={() => setRestaurant(null)} />
      ) : (
        <RestaurantGrid onPick={setRestaurant} />
      )}
    </div>
  );
}

function RestaurantGrid({ onPick }: { onPick: (r: PlatformRestaurant) => void }) {
  const { data, isLoading } = useRestaurants();
  const [search, setSearch] = useState('');
  const filtered = (data ?? []).filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search restaurants…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <button
              key={r._id}
              onClick={() => onPick(r)}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-secondary/50"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-base font-semibold">
                {r.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                <p className="truncate text-xs text-muted-foreground">{r.orderCount} orders</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      ) : (
        <EmptyState icon={Building2} title="No restaurants" />
      )}
    </div>
  );
}

function RestaurantCustomers({ restaurant, onBack }: { restaurant: PlatformRestaurant; onBack: () => void }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading } = useAllCustomers({ restaurantId: restaurant._id, search: search || undefined });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Restaurants
        </button>
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <Card className="divide-y divide-border">
          {data.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelected(c._id)}
              className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/50"
            >
              <Avatar>
                <AvatarFallback>{initials(c.name || c.phone)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name || 'Guest'}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.phone} · {c.totalOrders} orders
                  {c.lastOrderAt ? ` · last ${formatDate(c.lastOrderAt)}` : ''}
                </p>
              </div>
              <Badge variant="accent" className="gap-1">
                <Sparkles className="h-3 w-3" /> {c.points} pts
              </Badge>
              <span className="w-20 text-right text-sm font-semibold">{formatCurrency(c.totalSpent)}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </Card>
      ) : (
        <EmptyState icon={UserRound} title="No diners yet" description="Customers appear once this restaurant takes paid orders." />
      )}

      <CustomerAnalyticsDialog
        customerId={selected}
        open={Boolean(selected)}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </div>
  );
}
