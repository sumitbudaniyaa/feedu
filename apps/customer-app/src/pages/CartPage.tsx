import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Gift, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { Badge, Button, Card, EmptyState } from '@feedo/ui';
import { computeTotals, formatCurrency } from '@feedo/utils';
import { useCart } from '../store/cart.js';
import { useAccount, useAuth, useCheckout, usePayOrder } from '../lib/api.js';
import { loadRazorpay, openRazorpay } from '../lib/razorpay.js';
import { CheckoutDrawer } from '../components/CheckoutDrawer.js';

export function CartPage() {
  const navigate = useNavigate();
  const { restaurant, tableId, tableName, menuPath, lines, appliedReward, setQty, setReward, subtotal, clear } =
    useCart();
  const setActiveOrder = useCart((s) => s.setActiveOrder);
  const isAuthed = useAuth((s) => Boolean(s.tokens?.accessToken));
  const checkout = useCheckout(restaurant?.slug ?? '');
  const payOrder = usePayOrder();
  const { data: account } = useAccount(restaurant?.slug, isAuthed);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const goBack = () => navigate(menuPath ?? '/');

  // A reward needs a signed-in wallet — drop it if the session is gone.
  useEffect(() => {
    if (appliedReward && !isAuthed) setReward(null);
  }, [appliedReward, isAuthed, setReward]);

  const points = account?.customer?.points ?? 0;
  // Linked, affordable rewards the diner could add (excluding the one already applied).
  const eligibleRewards = (account?.rewards ?? []).filter(
    (rw) => rw.productId && rw.pointsCost <= points && rw._id !== appliedReward?.rewardId,
  );

  if (!restaurant || (lines.length === 0 && !appliedReward)) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
        <Header onBack={goBack} />
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            icon={ShoppingBag}
            title="Your cart is empty"
            description="Add a few dishes to get started."
            action={<Button onClick={goBack}>Browse menu</Button>}
          />
        </div>
      </div>
    );
  }

  const totals = computeTotals({
    subtotal: subtotal(),
    gstPercent: restaurant.gstPercent,
    inclusive: restaurant.inclusive,
  });

  const finish = (orderId: string) => {
    clear();
    setActiveOrder(orderId); // surface it as the ongoing-order pill on the menu
    // Flag the confirmation view so the track page celebrates a fresh order
    // (vs. opening the same page from order history).
    navigate(`/order/${orderId}`, { state: { justPlaced: true } });
  };

  // Called from the drawer after details are entered and validated.
  const proceed = async ({
    name,
    phone,
    paymentMethod,
  }: {
    name: string;
    phone: string;
    paymentMethod: 'razorpay' | 'cash';
  }) => {
    setError(null);
    setPaying(true);
    try {
      const { order, razorpay, demo, free, cash } = await checkout.mutateAsync({
        // Dine-in only restaurant — every order is dine-in.
        type: 'dine_in',
        tableId: tableId ?? undefined,
        tableName: tableName ?? undefined,
        items: lines.map((l) => ({
          productId: l.productId,
          variantLabel: l.variantLabel,
          addonLabels: l.addonLabels,
          quantity: l.quantity,
        })),
        customer: { name, phone },
        rewardId: appliedReward?.rewardId,
        paymentMethod,
      });

      // Reward-only (free) or pay-at-counter (cash) → already confirmed server-side, no payment step.
      if (free || cash) {
        finish(order._id);
        return;
      }

      // Demo mode (no Razorpay keys) — confirm directly so the flow is usable.
      if (demo || !razorpay) {
        await payOrder.mutateAsync({ orderId: order._id });
        finish(order._id);
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded) {
        setError('Could not load the payment gateway. Check your connection.');
        setPaying(false);
        return;
      }

      openRazorpay({
        key: razorpay.keyId,
        amount: razorpay.amount,
        currency: razorpay.currency,
        order_id: razorpay.orderId,
        name: restaurant.name,
        description: `Order ${order.orderNumber}`,
        prefill: { name, contact: phone },
        theme: { color: '#10B981' },
        handler: async (resp) => {
          try {
            await payOrder.mutateAsync({
              orderId: order._id,
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            });
            finish(order._id);
          } catch {
            setError('Payment captured but confirmation failed. Please contact staff.');
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
      setPaying(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-28">
      <Header onBack={goBack} />

      <main className="space-y-5 px-5 pt-2">
        {lines.length > 0 && (
          <Card className="divide-y divide-border">
            {lines.map((l) => (
              <div key={l.key} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[l.variantLabel, ...l.addonLabels].filter(Boolean).join(' · ') || 'Regular'}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatCurrency(l.unitPrice)} each</p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border px-1.5 py-1">
                  <button onClick={() => setQty(l.key, l.quantity - 1)} className="px-1">
                    {l.quantity === 1 ? <Trash2 className="h-3.5 w-3.5 text-destructive" /> : <Minus className="h-3.5 w-3.5" />}
                  </button>
                  <span className="w-5 text-center text-sm font-semibold tabular-nums">{l.quantity}</span>
                  <button onClick={() => setQty(l.key, l.quantity + 1)} className="px-1">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="w-16 text-right text-sm font-semibold">{formatCurrency(l.unitPrice * l.quantity)}</span>
              </div>
            ))}
          </Card>
        )}

        {/* Applied reward — a free item paid for with points */}
        {appliedReward && (
          <Card className="flex items-center gap-3 border-accent/40 bg-accent/5 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15">
              <Gift className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{appliedReward.title}</p>
              <p className="text-xs text-muted-foreground">Reward · {appliedReward.pointsCost} pts</p>
            </div>
            <Badge variant="accent">FREE</Badge>
            <button onClick={() => setReward(null)} className="rounded-md p-1 hover:bg-secondary" aria-label="Remove reward">
              <X className="h-4 w-4" />
            </button>
          </Card>
        )}

        {/* Add a reward with points */}
        {isAuthed && !appliedReward && eligibleRewards.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card
              className="space-y-2 overflow-hidden border-accent/30 p-4"
              style={{ background: 'linear-gradient(135deg, hsl(var(--accent) / 0.10), hsl(var(--accent) / 0.03))' }}
            >
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <motion.span
                  animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-accent"
                >
                  <Gift className="h-4 w-4" />
                </motion.span>
                Use your {points} points — free reward available
              </p>
              {eligibleRewards.map((rw) => (
                <div
                  key={rw._id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background/70 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{rw.title}</p>
                    <p className="text-xs text-muted-foreground">{rw.pointsCost} pts · free item</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      setReward({ rewardId: rw._id, title: rw.title, pointsCost: rw.pointsCost })
                    }
                  >
                    <Plus className="h-4 w-4" /> Add free
                  </Button>
                </div>
              ))}
            </Card>
          </motion.div>
        )}

        {!isAuthed && (
          <button
            onClick={() => navigate('/rewards')}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border p-3 text-left transition-colors hover:bg-secondary/40"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15">
              <Gift className="h-4 w-4 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Sign in to use reward points</p>
              <p className="text-xs text-muted-foreground">Redeem a free item with your points.</p>
            </div>
          </button>
        )}

        <Card className="space-y-1.5 p-4 text-sm">
          <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
          <Row label={`Tax (GST ${restaurant.gstPercent}%)`} value={formatCurrency(totals.taxAmount)} />
          {appliedReward && (
            <div className="flex justify-between text-accent">
              <span>{appliedReward.title}</span>
              <span>Free · {appliedReward.pointsCost} pts</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <span>To pay</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </Card>
      </main>

      {/* Sticky pay bar — opens the details drawer. */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-border bg-background/95 p-4 backdrop-blur">
        <Button variant="success" className="h-12 w-full justify-between rounded-xl" onClick={() => setDrawerOpen(true)}>
          <span>{totals.total > 0 ? 'Proceed to pay' : 'Place free order'}</span>
          <span>{formatCurrency(totals.total)}</span>
        </Button>
      </div>

      <CheckoutDrawer
        open={drawerOpen}
        total={totals.total}
        submitting={paying || checkout.isPending}
        error={error}
        onClose={() => setDrawerOpen(false)}
        onProceed={proceed}
      />
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 bg-background/85 px-5 py-4 backdrop-blur">
      <button onClick={onBack} className="rounded-lg p-1 hover:bg-secondary">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="text-lg font-semibold tracking-tight">Your order</h1>
    </header>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
