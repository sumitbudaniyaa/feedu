import { useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toPng } from 'html-to-image';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, ChefHat, Clock, CookingPot, Download, PartyPopper, Sparkles, XCircle } from 'lucide-react';
import { Button, Skeleton } from '@feedo/ui';
import { minutesSince } from '@feedo/utils';
import type { Order } from '@feedo/types';
import { useTrackOrder } from '../lib/api.js';
import { useCart } from '../store/cart.js';
import { InvoiceTicket } from '../components/InvoiceTicket.js';

/** Friendly ETA in minutes: the longest item prep time + a small buffer. */
function etaMinutes(order: Order): number {
  const maxPrep = Math.max(0, ...order.items.map((i) => i.prepTimeMinutes ?? 0));
  return Math.max(10, maxPrep + 3);
}

export function TrackPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const justPlaced = Boolean((location.state as { justPlaced?: boolean } | null)?.justPlaced);
  const menuPath = useCart((s) => s.menuPath);
  const { data: order, isLoading } = useTrackOrder(orderId);
  const ticketRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const goToMenu = () => navigate(menuPath ?? '/');
  const goBack = () => (justPlaced ? goToMenu() : navigate(-1));

  const downloadInvoice = async () => {
    if (!ticketRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(ticketRef.current, {
        pixelRatio: 2,
        backgroundColor: '#F7F7F8',
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `feedo-invoice-${order?.orderNumber ?? 'order'}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading || !order) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background p-5 pb-10">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <span className="text-xs text-muted-foreground">
          {justPlaced ? 'Order confirmation' : 'Order details'} · #{order.orderNumber}
        </span>
      </div>

      {/* Fresh-order confirmation banner — only on the post-checkout view. */}
      {justPlaced && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4"
        >
          <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
          <div>
            <p className="text-sm font-semibold text-success">Order placed successfully</p>
            <p className="text-xs text-muted-foreground">
              We&apos;ve sent it to the kitchen{order.tableName ? ` · ${order.tableName}` : ''}.
            </p>
          </div>
        </motion.div>
      )}

      <PreparingHero order={order} />

      {order.loyaltyPointsEarned > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-4 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium">You earned {order.loyaltyPointsEarned} reward points</p>
            <p className="text-xs text-muted-foreground">Saved to your number for next time.</p>
          </div>
        </motion.div>
      )}

      {/* Invoice */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">Invoice</p>
          <Button size="sm" variant="outline" onClick={downloadInvoice} disabled={downloading}>
            <Download className="h-4 w-4" /> {downloading ? 'Saving…' : 'Download'}
          </Button>
        </div>
        <InvoiceTicket ref={ticketRef} order={order} />
      </div>

      <Button variant="outline" className="mt-6 w-full" onClick={goToMenu}>
        Back to menu
      </Button>
    </div>
  );
}

function PreparingHero({ order }: { order: Order }) {
  const cancelled = order.status === 'cancelled' || order.status === 'refunded';
  const done = order.status === 'served' || order.status === 'completed';
  const ready = order.status === 'ready';
  const cooking = !cancelled && !done && !ready;

  const eta = etaMinutes(order);
  const elapsed = minutesSince(order.placedAt);
  const remaining = Math.max(0, eta - elapsed);
  const progress = Math.min(100, Math.round((elapsed / eta) * 100));

  const headline = cancelled
    ? 'Order cancelled'
    : done
      ? 'Enjoy your meal!'
      : ready
        ? 'Your order is ready!'
        : order.status === 'preparing'
          ? 'Cooking your order'
          : 'Order received';

  const sub = cancelled
    ? 'This order was cancelled.'
    : done
      ? 'Thanks for ordering with us.'
      : ready
        ? ''
        : remaining > 0
          ? `Ready in about ${remaining} min`
          : 'Almost ready…';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl p-6 text-white"
      style={{
        background: cancelled
          ? 'linear-gradient(150deg, hsl(var(--destructive)), hsl(var(--destructive) / 0.7))'
          : 'linear-gradient(150deg, hsl(var(--accent)), hsl(var(--accent) / 0.72) 65%, hsl(var(--accent) / 0.55))',
      }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <p className="text-xs font-medium uppercase tracking-widest text-white/80">Order #{order.orderNumber}</p>

      <div className="mt-5 flex flex-col items-center text-center">
        {/* Animated status icon */}
        <div className="relative flex h-24 w-24 items-center justify-center">
          {cooking && (
            <>
              {/* pulsing ring */}
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-white/40"
                animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              />
              {/* steam */}
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute h-2 w-2 rounded-full bg-white/70"
                  style={{ top: 8, left: 30 + i * 16 }}
                  animate={{ y: [-2, -16], opacity: [0, 0.9, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.35, ease: 'easeOut' }}
                />
              ))}
            </>
          )}
          <motion.div
            animate={ready ? { rotate: [0, -8, 8, -8, 0] } : cooking ? { y: [0, -4, 0] } : {}}
            transition={
              ready
                ? { duration: 0.6, repeat: 2 }
                : cooking
                  ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                  : {}
            }
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur"
          >
            {cancelled ? (
              <XCircle className="h-8 w-8" />
            ) : done ? (
              <PartyPopper className="h-8 w-8" />
            ) : ready ? (
              <ChefHat className="h-8 w-8" />
            ) : (
              <CookingPot className="h-8 w-8" />
            )}
          </motion.div>
        </div>

        <h1 className="mt-4 text-xl font-bold tracking-tight">{headline}</h1>
        {sub && <p className="mt-1 text-sm text-white/85">{sub}</p>}

        {cooking && (
          <div className="mt-5 w-full">
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <motion.div
                className="h-full rounded-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-white/80">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {elapsed} min elapsed
              </span>
              <span>ETA ~{eta} min</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
