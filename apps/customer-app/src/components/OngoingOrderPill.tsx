import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, ChevronUp, Clock, CreditCard, ReceiptText } from 'lucide-react';
import { Button, cn } from '@feedo/ui';
import { formatCurrency, minutesSince } from '@feedo/utils';
import type { Order } from '@feedo/types';
import { useCallWaiter, usePayOrder, useStartOrderPayment, useTrackOrder } from '../lib/api.js';
import { useCart } from '../store/cart.js';
import { loadRazorpay, openRazorpay } from '../lib/razorpay.js';

const STATUS: Record<string, { label: string; dot: string }> = {
  pending: { label: 'Order received', dot: 'bg-amber-400' },
  confirmed: { label: 'Confirmed', dot: 'bg-amber-400' },
  preparing: { label: 'Being prepared', dot: 'bg-amber-400' },
  ready: { label: 'Ready to serve', dot: 'bg-success' },
  served: { label: 'Served', dot: 'bg-success' },
  completed: { label: 'Completed', dot: 'bg-success' },
};

function etaMinutes(order: Order) {
  const maxPrep = Math.max(0, ...order.items.map((i) => i.prepTimeMinutes ?? 0));
  return Math.max(10, maxPrep + 3);
}

/** Floating, expandable pill for the diner's current order — pay, request bill, see status. */
export function OngoingOrderPill({ bottomClass = 'bottom-5' }: { bottomClass?: string }) {
  const orderId = useCart((s) => s.activeOrderId);
  const setActiveOrder = useCart((s) => s.setActiveOrder);
  const slug = useCart((s) => s.restaurant?.slug);
  const { data: order } = useTrackOrder(orderId ?? undefined);

  const startPay = useStartOrderPayment();
  const payOrder = usePayOrder();
  const callWaiter = useCallWaiter(slug ?? '');

  const [expanded, setExpanded] = useState(false);
  const [billAsked, setBillAsked] = useState(false);
  const [paying, setPaying] = useState(false);

  // Drop the pill once the order is finished + settled (or cancelled).
  const done =
    order &&
    (['cancelled', 'refunded'].includes(order.status) ||
      (['completed', 'served'].includes(order.status) && order.paymentStatus === 'paid'));
  useEffect(() => {
    if (done) {
      setActiveOrder(null);
      setExpanded(false);
    }
  }, [done, setActiveOrder]);

  if (!orderId || !order || done) return null;

  const unpaid = order.paymentStatus === 'unpaid';
  const meta = STATUS[order.status] ?? { label: order.status, dot: 'bg-accent' };
  const eta = etaMinutes(order);
  const remaining = Math.max(0, eta - minutesSince(order.placedAt));

  const payNow = async () => {
    if (!orderId) return;
    setPaying(true);
    try {
      const res = await startPay.mutateAsync(orderId);
      if (res.alreadyPaid || res.free) return;
      if (!res.razorpay || res.demo) {
        await payOrder.mutateAsync({ orderId }); // demo mode → confirm directly
        return;
      }
      const loaded = await loadRazorpay();
      if (!loaded) return;
      openRazorpay({
        key: res.razorpay.keyId,
        amount: res.razorpay.amount,
        currency: res.razorpay.currency,
        order_id: res.razorpay.orderId,
        name: 'Payment',
        description: `Order ${order.orderNumber}`,
        prefill: { name: order.customerName ?? '', contact: order.customerPhone ?? '' },
        theme: { color: '#10B981' },
        handler: async (r) => {
          await payOrder.mutateAsync({
            orderId,
            razorpayOrderId: r.razorpay_order_id,
            razorpayPaymentId: r.razorpay_payment_id,
            razorpaySignature: r.razorpay_signature,
          });
        },
        modal: { ondismiss: () => setPaying(false) },
      });
    } finally {
      setPaying(false);
    }
  };

  const requestBill = () => {
    if (billAsked) return;
    callWaiter.mutate(
      { tableName: order.tableName ?? 'Takeaway', reason: 'bill' },
      {
        onSuccess: () => {
          setBillAsked(true);
          setTimeout(() => setBillAsked(false), 6000);
        },
      },
    );
  };

  return (
    <div className={cn('fixed inset-x-0 z-40 mx-auto max-w-md px-5', bottomClass)}>
      <motion.div
        layout
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated"
      >
        {/* Collapsed header — always visible, toggles expand */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', meta.dot)} />
            <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', meta.dot)} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              Order #{order.orderNumber} · {meta.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {['completed', 'served', 'ready'].includes(order.status)
                ? unpaid
                  ? 'Payment pending'
                  : 'Enjoy!'
                : remaining > 0
                  ? `Ready in ~${remaining} min`
                  : 'Almost ready…'}
            </p>
          </div>
          {unpaid && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">Unpaid</span>}
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} className="text-muted-foreground">
            <ChevronUp className="h-4 w-4" />
          </motion.span>
        </button>

        {/* Expanded details */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="border-t border-border"
            >
              <div className="space-y-3 p-4">
                <div className="space-y-1.5">
                  {order.items.map((it, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">
                        <span className="text-accent">{it.quantity}×</span> {it.name}
                      </span>
                      <span className="shrink-0 text-muted-foreground">{formatCurrency(it.lineTotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {minutesSince(order.placedAt)} min ago
                  </span>
                  <span className="capitalize">· {order.paymentStatus}{order.paymentMethod ? ` · ${order.paymentMethod}` : ''}</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {unpaid && (
                    <Button variant="success" size="sm" className="flex-1" onClick={payNow} disabled={paying || startPay.isPending}>
                      <CreditCard className="h-4 w-4" /> {paying ? 'Opening…' : 'Pay now'}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="flex-1" onClick={requestBill} disabled={billAsked}>
                    {billAsked ? <BellRing className="h-4 w-4 text-success" /> : <ReceiptText className="h-4 w-4" />}
                    {billAsked ? 'Bill requested' : 'Request bill'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
