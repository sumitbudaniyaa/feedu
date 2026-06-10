import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState } from '@feedo/ui';
import { computeTotals, formatCurrency } from '@feedo/utils';
import { useCart } from '../store/cart.js';
import { useCheckout, usePayOrder } from '../lib/api.js';
import { loadRazorpay, openRazorpay } from '../lib/razorpay.js';
import { CheckoutDrawer } from '../components/CheckoutDrawer.js';

export function CartPage() {
  const navigate = useNavigate();
  const { restaurant, tableId, menuPath, lines, setQty, subtotal, clear } = useCart();
  const checkout = useCheckout(restaurant?.slug ?? '');
  const payOrder = usePayOrder();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const goBack = () => navigate(menuPath ?? '/');

  if (!restaurant || lines.length === 0) {
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
    navigate(`/order/${orderId}`);
  };

  // Called from the drawer after details are entered and validated.
  const proceed = async ({ name, phone }: { name: string; phone: string }) => {
    setError(null);
    setPaying(true);
    try {
      const { order, razorpay, demo } = await checkout.mutateAsync({
        type: tableId ? 'dine_in' : 'takeaway',
        tableId: tableId ?? undefined,
        items: lines.map((l) => ({
          productId: l.productId,
          variantLabel: l.variantLabel,
          addonLabels: l.addonLabels,
          quantity: l.quantity,
        })),
        customer: { name, phone },
      });

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

        <Card className="space-y-1.5 p-4 text-sm">
          <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
          <Row label={`Tax (GST ${restaurant.gstPercent}%)`} value={formatCurrency(totals.taxAmount)} />
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <span>To pay</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </Card>
      </main>

      {/* Sticky pay bar — opens the details drawer. */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-border bg-background/95 p-4 backdrop-blur">
        <Button variant="success" className="h-12 w-full justify-between rounded-xl" onClick={() => setDrawerOpen(true)}>
          <span>Proceed to pay</span>
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
