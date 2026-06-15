import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion';
import { BellRing, ChevronsRight, X } from 'lucide-react';
import { SOCKET_EVENTS } from '@feedo/types';
import { socket, useAttendCall, useAuth } from '../lib/api.js';

interface Call {
  id: number;
  tableName: string;
  reason: 'assistance' | 'bill';
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

/** Listens for table calls and shows ringing call(s) with slide-to-attend + close.
 *  `toast` = non-blocking cards pinned to the top (no backdrop) for the desktop admin.
 *  `drawer` = bottom sheet with a dimmed backdrop for the mobile waiter app. */
export function WaiterCallDrawer({ variant = 'drawer' }: { variant?: 'drawer' | 'toast' }) {
  const restaurantId = useAuth((s) => s.user?.restaurantId);
  const attendCall = useAttendCall();
  const [calls, setCalls] = useState<Call[]>([]);

  useEffect(() => {
    if (!restaurantId) return;
    const onCalled = (p: { tableName: string; reason?: 'assistance' | 'bill' }) =>
      setCalls((prev) => [...prev, { id: Date.now() + Math.random(), tableName: p.tableName, reason: p.reason ?? 'assistance' }]);
    // Someone (this or another device) accepted a table's call → clear it everywhere.
    const onAttending = (p: { tableName: string }) =>
      setCalls((prev) => prev.filter((c) => c.tableName !== p.tableName));
    socket.on(SOCKET_EVENTS.WAITER_CALLED, onCalled);
    socket.on(SOCKET_EVENTS.WAITER_ATTENDING, onAttending);
    return () => {
      socket.off(SOCKET_EVENTS.WAITER_CALLED, onCalled);
      socket.off(SOCKET_EVENTS.WAITER_ATTENDING, onAttending);
    };
  }, [restaurantId]);

  useEffect(() => {
    if (calls.length === 0) return;
    ring();
    const id = setInterval(ring, 3000);
    return () => clearInterval(id);
  }, [calls.length]);

  const attend = (call: Call) => {
    attendCall.mutate(call.tableName); // notify the diner "on the way"
    setCalls((prev) => prev.filter((c) => c.id !== call.id));
  };
  const dismiss = (id: number) => setCalls((prev) => prev.filter((c) => c.id !== id));

  // Top, non-blocking stack — leaves the rest of the dashboard fully usable.
  if (variant === 'toast') {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {calls.map((call) => (
            <motion.div
              key={call.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="pointer-events-auto w-full max-w-sm"
            >
              <CallCard call={call} mode="button" onAttend={() => attend(call)} onDismiss={() => dismiss(call.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  // Bottom sheet with backdrop — mobile waiter app.
  return (
    <AnimatePresence>
      {calls.length > 0 && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCalls([])}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl border-t border-border bg-card p-5 pb-7 shadow-elevated"
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">
                {calls.length} table{calls.length === 1 ? '' : 's'} calling
              </p>
              <button
                onClick={() => setCalls([])}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-secondary/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                {calls.map((call) => (
                  <CallCard key={call.id} call={call} mode="slide" onAttend={() => attend(call)} onDismiss={() => dismiss(call.id)} />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CallCard({
  call,
  mode,
  onAttend,
  onDismiss,
}: {
  call: Call;
  mode: 'slide' | 'button';
  onAttend: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className="overflow-hidden rounded-2xl border border-destructive/40 bg-card p-4 shadow-elevated"
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
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {call.reason === 'bill' ? 'Bill requested' : 'Needs assistance'}
          </p>
          <p className="truncate text-xl font-black tracking-tight">{call.tableName}</p>
        </div>
        {mode === 'button' ? (
          <button
            onClick={onAttend}
            className="shrink-0 rounded-full bg-success px-4 py-2 text-sm font-semibold text-success-foreground transition-colors hover:bg-success/90"
          >
            Attend
          </button>
        ) : null}
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-black/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {mode === 'slide' && (
        <div className="mt-4">
          <SlideToAttend onAttend={onAttend} />
        </div>
      )}
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
        {done ? 'On the way…' : 'Slide to attend'}
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
            setTimeout(onAttend, 220);
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
