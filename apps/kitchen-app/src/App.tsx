import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Clock, LogOut, Volume2, VolumeX } from 'lucide-react';
import { SOCKET_EVENTS } from '@feedo/types';
import type { Order, OrderStatus } from '@feedo/types';
import { Badge, Button, EmptyState, Skeleton, ThemeToggle, cn } from '@feedo/ui';
import { minutesSince } from '@feedo/utils';
import { ChefHat } from 'lucide-react';
import { socket, useAuth, useLogin, useLogout, useMe, useOrders, useUpdateOrderStatus } from './lib/api.js';
import { playNewOrderChime, primeSound } from './lib/sound.js';

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
  const [muted, setMuted] = useState(() => localStorage.getItem('feedo-kitchen-muted') === '1');

  // Keep the session user hydrated for restaurantId.
  useMe();

  useEffect(() => {
    if (!restaurantId) return;
    if (!socket.connected) socket.connect();
    socket.emit('join:restaurant', restaurantId);
    const refresh = () => qc.invalidateQueries({ queryKey: ['orders'] });
    const onNew = () => {
      refresh();
      if (localStorage.getItem('feedo-kitchen-muted') !== '1') playNewOrderChime();
    };
    socket.on(SOCKET_EVENTS.ORDER_CREATED, onNew);
    socket.on(SOCKET_EVENTS.ORDER_UPDATED, refresh);
    return () => {
      socket.off(SOCKET_EVENTS.ORDER_CREATED, onNew);
      socket.off(SOCKET_EVENTS.ORDER_UPDATED, refresh);
    };
  }, [restaurantId, qc]);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      localStorage.setItem('feedo-kitchen-muted', next ? '1' : '0');
      if (!next) playNewOrderChime(); // confirm sound when unmuting
      return next;
    });
  };

  const advance = (id: string, status: OrderStatus) => updateStatus.mutate({ id, status });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black italic leading-none tracking-tight text-foreground">feedo</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Kitchen</span>
          <Badge variant="outline">{orders?.length ?? 0} active</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleMute} title={muted ? 'Unmute new-order sound' : 'Mute new-order sound'}>
            {muted ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4" />}
          </Button>
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

/** Veg / non-veg marker (green / red dot in a bordered box). */
function VegMark({ isVeg }: { isVeg?: boolean }) {
  if (isVeg === undefined) return null;
  return (
    <span
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border bg-white',
        isVeg ? 'border-green-600' : 'border-red-600',
      )}
      title={isVeg ? 'Veg' : 'Non-veg'}
    >
      <span className={cn('h-2 w-2 rounded-full', isVeg ? 'bg-green-600' : 'bg-red-600')} />
    </span>
  );
}

// Status → full-card theme. New = black, preparing = yellow, ready = green.
type CardTheme = { card: string; sub: string; divide: string; qty: string; btn: string; itemBg: string };
const NEW_THEME: CardTheme = {
  card: 'bg-neutral-950 text-white border-neutral-800',
  sub: 'text-neutral-400',
  divide: 'border-neutral-800',
  qty: 'text-amber-400',
  btn: 'bg-white text-neutral-950 hover:bg-white/90',
  itemBg: 'bg-white/5',
};
const THEMES: Record<string, CardTheme> = {
  pending: NEW_THEME,
  confirmed: NEW_THEME,
  preparing: {
    card: 'bg-amber-400 text-neutral-950 border-amber-500',
    sub: 'text-neutral-800',
    divide: 'border-amber-500/60',
    qty: 'text-neutral-900',
    btn: 'bg-neutral-950 text-white hover:bg-neutral-800',
    itemBg: 'bg-black/10',
  },
  ready: {
    card: 'bg-emerald-500 text-white border-emerald-600',
    sub: 'text-emerald-50/80',
    divide: 'border-emerald-400/50',
    qty: 'text-white',
    btn: 'bg-neutral-950 text-white hover:bg-neutral-800',
    itemBg: 'bg-black/15',
  },
};

function OrderCard({ order, onAdvance }: { order: Order; onAdvance: (id: string, status: OrderStatus) => void }) {
  const waiting = minutesSince(order.placedAt);
  const urgent = waiting >= 12;
  const t = THEMES[order.status] ?? NEW_THEME;

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
      <div className={cn('overflow-hidden rounded-xl border shadow-card', t.card)}>
        <div className={cn('flex items-center justify-between border-b px-5 py-3', t.divide)}>
          <span className="flex items-center gap-2 text-xl font-bold tracking-tight">
            #{order.orderNumber}
            {order.isReward && (
              <span className="rounded-full bg-black/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                🎁 Reward
              </span>
            )}
          </span>
          <span className="rounded-full bg-black/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
            {order.status === 'pending' || order.status === 'confirmed' ? 'New' : order.status}
          </span>
        </div>

        {/* Table number — the most important thing for the kitchen/runner. */}
        <div className={cn('flex items-center justify-between border-b px-5 py-2.5', t.divide)}>
          <span className="text-xs font-semibold uppercase tracking-widest opacity-70">Table</span>
          <span className="text-2xl font-black tracking-tight">{order.tableName || 'Takeaway'}</span>
        </div>

        <div className="space-y-2 px-4 py-4">
          {order.items.map((item, i) => (
            <div key={i} className={cn('flex items-center gap-2.5 rounded-lg px-3 py-2 text-lg', t.itemBg)}>
              <VegMark isVeg={item.isVeg} />
              <span className={cn('font-bold', t.qty)}>{item.quantity}×</span>
              <span className="font-medium leading-tight">{item.name}</span>
              {item.variantLabel && <span className={cn('text-sm', t.sub)}>({item.variantLabel})</span>}
            </div>
          ))}
        </div>

        <div className={cn('flex items-center justify-between border-t px-5 py-3', t.divide)}>
          <span className={cn('flex items-center gap-1.5 text-sm font-semibold', urgent && order.status !== 'ready' ? 'text-red-600' : t.sub)}>
            <Clock className="h-4 w-4" /> {waiting} min{waiting === 1 ? '' : 's'}
          </span>
          {(order.status === 'pending' || order.status === 'confirmed') && (
            <button className={cn('h-8 rounded-lg px-3 text-sm font-medium transition-colors', t.btn)} onClick={() => onAdvance(order._id, 'preparing')}>
              Start preparing
            </button>
          )}
          {order.status === 'preparing' && (
            <button className={cn('h-8 rounded-lg px-3 text-sm font-medium transition-colors', t.btn)} onClick={() => onAdvance(order._id, 'ready')}>
              Mark ready
            </button>
          )}
          {order.status === 'ready' && (
            <button className={cn('h-8 rounded-lg px-3 text-sm font-medium transition-colors', t.btn)} onClick={() => onAdvance(order._id, 'served')}>
              Mark served
            </button>
          )}
        </div>
      </div>
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
          primeSound(); // unlock audio within this user gesture
          const fd = new FormData(e.currentTarget);
          login.mutate({ email: String(fd.get('email')), password: String(fd.get('password')) });
        }}
      >
        <div className="mb-6 text-center">
          <span className="block text-3xl font-black italic tracking-tight text-foreground">feedo</span>
          <span className="mt-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Kitchen</span>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to view live orders</p>
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
