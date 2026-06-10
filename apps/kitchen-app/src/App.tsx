import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, ThemeToggle, cn } from '@feedo/ui';

type Status = 'preparing' | 'ready' | 'served';

interface KOrder {
  id: string;
  table: string;
  items: { qty: number; name: string }[];
  placedAt: number;
  status: Status;
}

// Placeholder queue — replaced by Socket.IO live orders in Phase 3.
const initialOrders: KOrder[] = [
  {
    id: '1',
    table: 'Table 12',
    items: [
      { qty: 2, name: 'Butter Chicken' },
      { qty: 1, name: 'Garlic Naan' },
      { qty: 1, name: 'Coke' },
    ],
    placedAt: Date.now() - 1000 * 60 * 8,
    status: 'preparing',
  },
  {
    id: '2',
    table: 'Table 4',
    items: [
      { qty: 1, name: 'Paneer Tikka' },
      { qty: 2, name: 'Masala Chai' },
    ],
    placedAt: Date.now() - 1000 * 60 * 3,
    status: 'preparing',
  },
  {
    id: '3',
    table: 'Takeaway #88',
    items: [{ qty: 3, name: 'Gulab Jamun' }],
    placedAt: Date.now() - 1000 * 60 * 14,
    status: 'ready',
  },
];

const statusMeta: Record<Status, { label: string; variant: 'warning' | 'success' | 'default' }> = {
  preparing: { label: 'Preparing', variant: 'warning' },
  ready: { label: 'Ready', variant: 'success' },
  served: { label: 'Served', variant: 'default' },
};

export function App() {
  const [orders, setOrders] = useState(initialOrders);

  const advance = (id: string, status: Status) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
            <span className="text-sm font-bold">F</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Kitchen Display</h1>
          <Badge variant="outline">{orders.filter((o) => o.status !== 'served').length} active</Badge>
        </div>
        <ThemeToggle />
      </header>

      <main className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} onAdvance={advance} />
        ))}
      </main>
    </div>
  );
}

function OrderCard({
  order,
  onAdvance,
}: {
  order: KOrder;
  onAdvance: (id: string, status: Status) => void;
}) {
  const waiting = Math.floor((Date.now() - order.placedAt) / 60000);
  const urgent = waiting >= 12;
  const meta = statusMeta[order.status];

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
      <Card className={cn('overflow-hidden', urgent && order.status !== 'served' && 'border-destructive/50')}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="text-xl font-bold tracking-tight">{order.table}</span>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>

        <div className="space-y-2 px-5 py-4">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-baseline gap-3 text-lg">
              <span className="font-bold text-accent">{item.qty}×</span>
              <span className="font-medium">{item.name}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium',
              urgent ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            <Clock className="h-4 w-4" />
            {waiting} min{waiting === 1 ? '' : 's'}
          </span>

          {order.status === 'preparing' && (
            <Button size="sm" onClick={() => onAdvance(order.id, 'ready')}>
              Mark ready
            </Button>
          )}
          {order.status === 'ready' && (
            <Button size="sm" variant="secondary" onClick={() => onAdvance(order.id, 'served')}>
              Mark served
            </Button>
          )}
          {order.status === 'served' && (
            <span className="text-sm text-muted-foreground">Done</span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
