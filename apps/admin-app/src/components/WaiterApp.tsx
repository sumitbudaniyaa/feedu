import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion';
import { BellRing, Boxes, ChevronsRight, LogOut, ShoppingBag } from 'lucide-react';
import { ThemeToggle } from '@feedo/ui';
import { SOCKET_EVENTS } from '@feedo/types';
import { useNavigate } from 'react-router-dom';
import { socket, useLogout } from '../lib/api.js';
import { OrdersPage } from '../pages/OrdersPage.js';
import { InventoryPage } from '../pages/InventoryPage.js';

interface Call {
  id: number;
  tableName: string;
}

/** Repeating attention ring + vibration. */
function ring() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.2].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 920;
      gain.gain.setValueAtTime(0.001, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.2);
    });
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    setTimeout(() => ctx.close(), 800);
  } catch {
    /* ignore */
  }
}

/** Mobile waiter app: Orders + Inventory, with table calls arriving as a drawer. */
export function WaiterApp() {
  const logout = useLogout();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'orders' | 'inventory'>('orders');
  const [calls, setCalls] = useState<Call[]>([]);

  useEffect(() => {
    const onCalled = (p: { tableName: string }) =>
      setCalls((prev) => [...prev, { id: Date.now() + Math.random(), tableName: p.tableName }]);
    socket.on(SOCKET_EVENTS.WAITER_CALLED, onCalled);
    return () => {
      socket.off(SOCKET_EVENTS.WAITER_CALLED, onCalled);
    };
  }, []);

  // Ring while any call is pending.
  useEffect(() => {
    if (calls.length === 0) return;
    ring();
    const id = setInterval(ring, 3000);
    return () => clearInterval(id);
  }, [calls.length]);

  const attend = (id: number) => setCalls((prev) => prev.filter((c) => c.id !== id));

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <span className="text-xl font-black italic tracking-tight">feedu</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Waiter</span>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            aria-label="Log out"
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-3 pb-20 pt-3">{tab === 'orders' ? <OrdersPage /> : <InventoryPage />}</main>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md border-t border-border bg-card">
        <TabButton active={tab === 'orders'} onClick={() => setTab('orders')} icon={ShoppingBag} label="Orders" />
        <TabButton active={tab === 'inventory'} onClick={() => setTab('inventory')} icon={Boxes} label="Inventory" />
      </nav>

      {/* Incoming table calls — drawer that rings until attended */}
      <AnimatePresence>
        {calls.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md space-y-3 rounded-t-3xl border-t border-border bg-card p-5 pb-7 shadow-elevated"
            >
              <div className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-border" />
              <p className="text-sm font-semibold">
                {calls.length} table{calls.length === 1 ? '' : 's'} calling
              </p>
              <AnimatePresence>
                {calls.map((call) => (
                  <CallCard key={call.id} call={call} onAttend={() => attend(call.id)} />
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-medium ${active ? 'text-accent' : 'text-muted-foreground'}`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

function CallCard({ call, onAttend }: { call: Call; onAttend: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className="overflow-hidden rounded-2xl border border-destructive/40 bg-destructive/10 p-4"
    >
      <div className="flex items-center gap-3">
        <motion.span
          animate={{ rotate: [0, -18, 18, -18, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.3 }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive text-white"
        >
          <BellRing className="h-6 w-6" />
        </motion.span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Table calling</p>
          <p className="truncate text-xl font-black tracking-tight">{call.tableName}</p>
        </div>
      </div>
      <div className="mt-4">
        <SlideToAttend onAttend={onAttend} />
      </div>
    </motion.div>
  );
}

function SlideToAttend({ onAttend }: { onAttend: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [max, setMax] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const w = trackRef.current?.offsetWidth ?? 0;
    setMax(Math.max(0, w - 56));
  }, []);

  return (
    <div ref={trackRef} className="relative h-14 select-none overflow-hidden rounded-full bg-success/20">
      <div className="absolute inset-0 flex items-center justify-center pl-8 text-sm font-semibold text-success">
        {done ? 'Attending…' : 'Slide to attend'}
      </div>
      <motion.button
        drag="x"
        dragConstraints={{ left: 0, right: max }}
        dragElastic={0}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={() => {
          if (x.get() >= max * 0.75) {
            setDone(true);
            animate(x, max, { duration: 0.12 });
            setTimeout(onAttend, 200);
          } else {
            animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
          }
        }}
        className="absolute left-1 top-1 flex h-12 w-12 items-center justify-center rounded-full bg-success text-white shadow-md"
        aria-label="Slide to attend"
      >
        <ChevronsRight className="h-5 w-5" />
      </motion.button>
    </div>
  );
}
