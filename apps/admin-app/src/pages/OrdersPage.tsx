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
  { value: 'unpaid', label: 'Pending payment' },
  { value: 'all', label: 'All' },
];

// Mirror the backend's `active` filter exactly (orders.service.listOrders).
const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];
const isActive = (o: { status: string; paymentStatus: string }) =>
  ACTIVE_STATUSES.includes(o.status) &&
  // Pending + unpaid orders are awaiting online payment — never shown as active.
  !(o.status === 'pending' && o.paymentStatus === 'unpaid');

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
  // "unpaid" isn't a server filter — fetch all and narrow client-side.
  const { data: orders, isLoading } = useOrders(
    filter === 'active'
      ? { active: true }
      : filter === 'all' || filter === 'unpaid'
        ? {}
        : { status: filter },
  );
  const updateStatus = useUpdateOrderStatus();
  const confirm = useConfirm();
  const [selected, setSelected] = useState<Order | null>(null);

  // All orders (for the tab counts), independent of the selected filter.
  const { data: allOrders } = useOrders({});
  const counts = {
    active: (allOrders ?? []).filter(isActive).length,
    unpaid: (allOrders ?? []).filter(
      (o) => o.paymentStatus === 'unpaid' && !['cancelled', 'refunded'].includes(o.status),
    ).length,
  };

  // Pending-payment view: unpaid orders that are still collectable (not cancelled/refunded).
  const displayed =
    filter === 'unpaid'
      ? (orders ?? []).filter(
          (o) => o.paymentStatus === 'unpaid' && !['cancelled', 'refunded'].includes(o.status),
        )
      : orders;

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="Live order management — updates in real time." />

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          {FILTERS.map((f) => {
            const count = f.value === 'active' ? counts.active : f.value === 'unpaid' ? counts.unpaid : null;
            return (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
                {count != null && count > 0 && (
                  <span className="ml-1.5 rounded-full bg-secondary px-1.5 text-xs font-semibold tabular-nums">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : displayed && displayed.length > 0 ? (
        <div className="grid gap-3">
          {displayed.map((order) => (
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
        <EmptyState
          icon={ShoppingBag}
          title={filter === 'unpaid' ? 'No pending payments' : 'No orders here'}
          description={
            filter === 'unpaid'
              ? 'Orders awaiting payment will show up here.'
              : 'New orders will appear automatically.'
          }
        />
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
