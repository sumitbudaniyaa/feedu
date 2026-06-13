import { useState } from 'react';
import { ReceiptText } from 'lucide-react';
import { Badge, Card, EmptyState, Skeleton } from '@feedo/ui';
import { formatCurrency, formatRelativeTime } from '@feedo/utils';
import type { PlatformOrder } from '@feedo/api';
import { useAllOrders } from '../lib/api.js';
import { OrderDetailsDialog } from '../components/OrderDetailsDialog.js';

const STATUS_VARIANT: Record<string, 'default' | 'accent' | 'success' | 'warning' | 'destructive'> = {
  pending: 'warning',
  confirmed: 'accent',
  preparing: 'warning',
  ready: 'success',
  served: 'default',
  completed: 'success',
  cancelled: 'destructive',
  refunded: 'destructive',
};

export function OrdersPage() {
  const { data, isLoading } = useAllOrders();
  const [selected, setSelected] = useState<PlatformOrder | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live order feed across every restaurant.</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <Card className="divide-y divide-border">
          {data.map((o) => (
            <button
              key={o._id}
              onClick={() => setSelected(o)}
              className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">#{o.orderNumber}</span>
                  <Badge variant={STATUS_VARIANT[o.status]} className="capitalize">
                    {o.status}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {o.restaurantName ?? 'Unknown'} · {o.items.length} item{o.items.length > 1 ? 's' : ''} ·{' '}
                  {formatRelativeTime(o.placedAt)}
                </p>
              </div>
              <span className="text-sm font-semibold">{formatCurrency(o.total)}</span>
            </button>
          ))}
        </Card>
      ) : (
        <EmptyState icon={ReceiptText} title="No orders yet" />
      )}

      <OrderDetailsDialog
        order={selected}
        restaurantName={selected?.restaurantName}
        open={Boolean(selected)}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </div>
  );
}
