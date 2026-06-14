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
  useConfirm,
} from '@feedo/ui';
import { formatCurrency, formatRelativeTime } from '@feedo/utils';
import type { Order, OrderStatus } from '@feedo/types';
import { useOrders, useUpdateOrderStatus } from '../lib/api.js';
import { PageHeader } from '../components/PageHeader.js';
import { OrderDetailsDialog } from '../components/OrderDetailsDialog.js';

const FILTERS: { value: string; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'all', label: 'All' },
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

// Next action offered per status. "Mark served" auto-completes the order (no separate step).
const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  pending: { to: 'confirmed', label: 'Confirm' },
  confirmed: { to: 'preparing', label: 'Start preparing' },
  preparing: { to: 'ready', label: 'Mark ready' },
  ready: { to: 'served', label: 'Mark served' },
};

export function OrdersPage() {
  const [filter, setFilter] = useState('active');
  const { data: orders, isLoading } = useOrders(
    filter === 'active' ? { active: true } : filter === 'all' ? {} : { status: filter },
  );
  const updateStatus = useUpdateOrderStatus();
  const confirm = useConfirm();
  const [selected, setSelected] = useState<Order | null>(null);

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
              onDetails={() => setSelected(order)}
              onAdvance={(to) => updateStatus.mutate({ id: order._id, status: to })}
              onCancel={async () => {
                if (
                  await confirm({
                    title: `Cancel order #${order.orderNumber}?`,
                    description: 'This cannot be undone.',
                    confirmText: 'Cancel order',
                    cancelText: 'Keep',
                    destructive: true,
                  })
                )
                  updateStatus.mutate({ id: order._id, status: 'cancelled' });
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={ShoppingBag} title="No orders here" description="New orders will appear automatically." />
      )}

      <OrderDetailsDialog order={selected} open={Boolean(selected)} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  );
}

function OrderRow({
  order,
  onAdvance,
  onCancel,
  onDetails,
}: {
  order: Order;
  onAdvance: (to: OrderStatus) => void;
  onCancel: () => void;
  onDetails: () => void;
}) {
  const next = NEXT[order.status];
  const terminal = ['completed', 'cancelled', 'refunded'].includes(order.status);
  const unpaid = order.paymentStatus === 'unpaid';

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">#{order.orderNumber}</span>
            <Badge variant={STATUS_VARIANT[order.status]} className="capitalize">
              {order.status}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {order.type.replace('_', '-')}
            </Badge>
            {order.channel && order.channel !== 'app' && (
              <Badge variant="outline" className="capitalize">
                {order.channel}
              </Badge>
            )}
            {unpaid ? (
              <Badge variant="destructive">Unpaid</Badge>
            ) : (
              <Badge variant="success">Paid</Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {order.customerName ? `${order.customerName} · ` : ''}
            {formatRelativeTime(order.placedAt)} · {order.items.length} item
            {order.items.length > 1 ? 's' : ''}
          </p>
        </div>
        <p className="font-semibold">{formatCurrency(order.total)}</p>
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

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onDetails}>
          Details & payment
        </Button>
        {!terminal && next && (
          <Button size="sm" onClick={() => onAdvance(next.to)}>
            {next.label}
          </Button>
        )}
        {!terminal && order.status !== 'served' && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
}
