import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, X } from 'lucide-react';
import { SOCKET_EVENTS } from '@feedo/types';
import { socket, useAuth } from '../lib/api.js';

interface Call {
  id: number;
  tableName: string;
}

/** Plays a short attention chime via the Web Audio API. */
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.18].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.18);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    /* audio not available — ignore */
  }
}

/** Listens for waiter-call events and shows a dismissible popup + sound. */
export function WaiterCallToast() {
  const restaurantId = useAuth((s) => s.user?.restaurantId);
  const [calls, setCalls] = useState<Call[]>([]);

  useEffect(() => {
    if (!restaurantId) return;
    const onCalled = (payload: { tableName: string }) => {
      setCalls((prev) => [...prev, { id: Date.now() + Math.random(), tableName: payload.tableName }]);
      chime();
    };
    socket.on(SOCKET_EVENTS.WAITER_CALLED, onCalled);
    return () => {
      socket.off(SOCKET_EVENTS.WAITER_CALLED, onCalled);
    };
  }, [restaurantId]);

  const dismiss = (id: number) => setCalls((prev) => prev.filter((c) => c.id !== id));

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {calls.map((call) => (
          <motion.div
            key={call.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-accent/40 bg-accent px-4 py-3 text-accent-foreground shadow-elevated"
          >
            <motion.span
              animate={{ rotate: [0, -15, 15, -15, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.4 }}
            >
              <BellRing className="h-6 w-6" />
            </motion.span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Assistance needed</p>
              <p className="text-sm">
                Please visit <span className="font-bold">{call.tableName}</span>
              </p>
            </div>
            <button onClick={() => dismiss(call.id)} aria-label="Dismiss" className="rounded-lg p-1 hover:bg-black/10">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
