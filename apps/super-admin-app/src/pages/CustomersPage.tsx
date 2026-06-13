import { Sparkles, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, Badge, Card, EmptyState, Skeleton } from '@feedo/ui';
import { formatCurrency, initials } from '@feedo/utils';
import { useAllCustomers } from '../lib/api.js';

export function CustomersPage() {
  const { data, isLoading } = useAllCustomers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Diners across all restaurants, ranked by spend.</p>
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
            <div key={c._id} className="flex items-center gap-3 p-4">
              <Avatar>
                <AvatarFallback>{initials(c.name || c.phone)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name || 'Guest'}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.phone} · {c.restaurantName ?? 'Unknown'} · {c.totalOrders} orders
                </p>
              </div>
              <Badge variant="accent" className="gap-1">
                <Sparkles className="h-3 w-3" /> {c.points} pts
              </Badge>
              <span className="w-20 text-right text-sm font-semibold">{formatCurrency(c.totalSpent)}</span>
            </div>
          ))}
        </Card>
      ) : (
        <EmptyState icon={UserRound} title="No customers yet" />
      )}
    </div>
  );
}
