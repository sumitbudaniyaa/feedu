import { useState } from 'react';
import { ChevronRight, Search, Sparkles, Users } from 'lucide-react';
import { Avatar, AvatarFallback, Badge, Card, EmptyState, Input, Skeleton } from '@feedo/ui';
import { formatCurrency, formatRelativeTime, initials } from '@feedo/utils';
import { customers as customersApi } from '../lib/api.js';
import { PageHeader } from '../components/PageHeader.js';
import { CustomerAnalyticsDialog } from '../components/CustomerAnalyticsDialog.js';

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading } = customersApi.useList(search ? { search } : undefined);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Diners who ordered, ranked by spend — with their loyalty points."
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <Card className="divide-y divide-border">
          {data.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelected(c._id)}
              className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-secondary/50"
            >
              <Avatar>
                <AvatarFallback>{initials(c.name || c.phone)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name || 'Guest'}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.phone} · {c.totalOrders} order{c.totalOrders === 1 ? '' : 's'}
                  {c.lastOrderAt ? ` · last ${formatRelativeTime(c.lastOrderAt)}` : ''}
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
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="As diners place paid orders, they'll appear here with their loyalty points."
        />
      )}

      <CustomerAnalyticsDialog
        customerId={selected}
        open={Boolean(selected)}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </div>
  );
}
