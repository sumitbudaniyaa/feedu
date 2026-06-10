import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Clock, LogOut } from 'lucide-react';
import { SOCKET_EVENTS } from '@feedo/types';
import type { Order, OrderStatus } from '@feedo/types';
import { Badge, Button, Card, EmptyState, Skeleton, ThemeToggle, cn } from '@feedo/ui';
import { minutesSince } from '@feedo/utils';
import { ChefHat } from 'lucide-react';
import { socket, useAuth, useLogin, useLogout, useMe, useOrders, useUpdateOrderStatus } from './lib/api.js';

export function App() {
  const isAuthed = useAuth((s) => Boolean(s.tokens?.accessToken));
  return isAuthed ? <KitchenBoard /> : <KitchenLogin />;
}

function KitchenBoard() {
  const { data: orders, isLoading } = useOrders({ active: true });
  const updateStatus = useUpdateOrderStatus();
  const logout = useLogout();
  const restaurantId = useAuth((s) => s.user?.restaurantId);
  const qc = useQueryClient();

  // Keep the session user hydrated for restaurantId.
  useMe();

  useEffect(() => {
    if (!restaurantId) return;
    if (!socket.connected) socket.connect();
    socket.emit('join:restaurant', restaurantId);
    const refresh = () => qc.invalidateQueries({ queryKey: ['orders'] });
    socket.on(SOCKET_EVENTS.ORDER_CREATED, refresh);
    socket.on(SOCKET_EVENTS.ORDER_UPDATED, refresh);
    return () => {
      socket.off(SOCKET_EVENTS.ORDER_CREATED, refresh);
      socket.off(SOCKET_EVENTS.ORDER_UPDATED, refresh);
    };
  }, [restaurantId, qc]);

  const advance = (id: string, status: OrderStatus) => updateStatus.mutate({ id, status });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
            <span className="text-sm font-bold">F</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Kitchen Display</h1>
          <Badge variant="outline">{orders?.length ?? 0} active</Badge>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : orders && orders.length > 0 ? (
        <main className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <OrderCard key={order._id} order={order} onAdvance={advance} />
          ))}
        </main>
      ) : (
        <div className="p-10">
          <EmptyState icon={ChefHat} title="No active orders" description="New orders appear here the moment they're placed." />
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onAdvance }: { order: Order; onAdvance: (id: string, status: OrderStatus) => void }) {
  const waiting = minutesSince(order.placedAt);
  const urgent = waiting >= 12;

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
      <Card className={cn('overflow-hidden', urgent && 'border-destructive/50')}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="text-xl font-bold tracking-tight">#{order.orderNumber}</span>
          <Badge variant={order.status === 'ready' ? 'success' : 'warning'} className="capitalize">
            {order.status}
          </Badge>
        </div>

        <div className="space-y-2 px-5 py-4">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-baseline gap-3 text-lg">
              <span className="font-bold text-accent">{item.quantity}×</span>
              <span className="font-medium">{item.name}</span>
              {item.variantLabel && <span className="text-sm text-muted-foreground">({item.variantLabel})</span>}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className={cn('flex items-center gap-1.5 text-sm font-medium', urgent ? 'text-destructive' : 'text-muted-foreground')}>
            <Clock className="h-4 w-4" /> {waiting} min{waiting === 1 ? '' : 's'}
          </span>
          {(order.status === 'pending' || order.status === 'confirmed') && (
            <Button size="sm" onClick={() => onAdvance(order._id, 'preparing')}>
              Start preparing
            </Button>
          )}
          {order.status === 'preparing' && (
            <Button size="sm" onClick={() => onAdvance(order._id, 'ready')}>
              Mark ready
            </Button>
          )}
          {order.status === 'ready' && (
            <Button size="sm" variant="secondary" onClick={() => onAdvance(order._id, 'served')}>
              Mark served
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function KitchenLogin() {
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
          <h1 className="text-lg font-semibold tracking-tight">Kitchen Display</h1>
          <p className="text-sm text-muted-foreground">Sign in to view live orders</p>
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
