import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@feedo/ui';
import { formatCurrency, formatRelativeTime } from '@feedo/utils';
import type { Order, OrderStatus } from '@feedo/types';
import { useOrders, useUpdateOrderStatus } from '../lib/api.js';
import { PageHeader } from '../components/PageHeader.js';

const FILTERS: { value: string; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

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

// Next action offered per status.
const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  pending: { to: 'confirmed', label: 'Confirm' },
  confirmed: { to: 'preparing', label: 'Start preparing' },
  preparing: { to: 'ready', label: 'Mark ready' },
  ready: { to: 'served', label: 'Mark served' },
  served: { to: 'completed', label: 'Complete' },
};

export function OrdersPage() {
  const [filter, setFilter] = useState('active');
  const { data: orders, isLoading } = useOrders(
    filter === 'active' ? { active: true } : filter === 'all' ? {} : { status: filter },
  );
  const updateStatus = useUpdateOrderStatus();

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="Live order management — updates in real time." />

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="grid gap-3">
          {orders.map((order) => (
            <OrderRow
              key={order._id}
              order={order}
              onAdvance={(to) => updateStatus.mutate({ id: order._id, status: to })}
              onCancel={() => updateStatus.mutate({ id: order._id, status: 'cancelled' })}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={ShoppingBag} title="No orders here" description="New orders will appear automatically." />
      )}
    </div>
  );
}

function OrderRow({
  order,
  onAdvance,
  onCancel,
}: {
  order: Order;
  onAdvance: (to: OrderStatus) => void;
  onCancel: () => void;
}) {
  const next = NEXT[order.status];
  const terminal = ['completed', 'cancelled', 'refunded'].includes(order.status);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">#{order.orderNumber}</span>
            <Badge variant={STATUS_VARIANT[order.status]} className="capitalize">
              {order.status}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {order.type.replace('_', '-')}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatRelativeTime(order.placedAt)} · {order.items.length} item
            {order.items.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{formatCurrency(order.total)}</p>
          <p className="text-xs capitalize text-muted-foreground">{order.paymentStatus}</p>
        </div>
      </div>

      <div className="mt-3 space-y-1 border-t border-border pt-3">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-baseline gap-2 text-sm">
            <span className="font-medium text-accent">{item.quantity}×</span>
            <span>{item.name}</span>
            {item.variantLabel && <span className="text-xs text-muted-foreground">({item.variantLabel})</span>}
          </div>
        ))}
      </div>

      {!terminal && (
        <div className="mt-3 flex gap-2">
          {next && (
            <Button size="sm" onClick={() => onAdvance(next.to)}>
              {next.label}
            </Button>
          )}
          {order.status !== 'served' && (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
