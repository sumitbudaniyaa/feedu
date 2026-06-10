import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@feedo/ui';
import { computeTotals, formatCurrency } from '@feedo/utils';
import type { Restaurant } from '@feedo/types';
import { useCart } from '../store/cart.js';
import { usePlaceOrder } from '../lib/api.js';

export function CartSheet({
  open,
  onClose,
  restaurant,
}: {
  open: boolean;
  onClose: () => void;
  restaurant: Restaurant;
}) {
  const navigate = useNavigate();
  const { lines, setQty, subtotal, tableId, clear } = useCart();
  const place = usePlaceOrder(restaurant.slug);

  const totals = computeTotals({
    subtotal: subtotal(),
    gstPercent: restaurant.tax?.gstPercent ?? 5,
    inclusive: restaurant.tax?.inclusive ?? false,
  });

  const checkout = () => {
    place.mutate(
      {
        type: tableId ? 'dine_in' : 'takeaway',
        tableId: tableId ?? undefined,
        items: lines.map((l) => ({
          productId: l.productId,
          variantLabel: l.variantLabel,
          addonLabels: l.addonLabels,
          quantity: l.quantity,
        })),
      },
      {
        onSuccess: (order) => {
          clear();
          onClose();
          navigate(`/order/${order._id}`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Your order</DialogTitle>
        </DialogHeader>

        <div className="max-h-64 space-y-3 overflow-y-auto">
          {lines.map((l) => (
            <div key={l.key} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{l.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[l.variantLabel, ...l.addonLabels].filter(Boolean).join(' · ') || 'Regular'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(l.key, l.quantity - 1)} className="rounded-md border border-border p-1">
                  {l.quantity === 1 ? <Trash2 className="h-3.5 w-3.5 text-destructive" /> : <Minus className="h-3.5 w-3.5" />}
                </button>
                <span className="w-5 text-center text-sm">{l.quantity}</span>
                <button onClick={() => setQty(l.key, l.quantity + 1)} className="rounded-md border border-border p-1">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="w-16 text-right text-sm font-medium">
                {formatCurrency(l.unitPrice * l.quantity)}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-1.5 border-t border-border pt-3 text-sm">
          <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
          <Row label={`Tax (${restaurant.tax?.gstPercent ?? 5}%)`} value={formatCurrency(totals.taxAmount)} />
          <div className="flex justify-between pt-1 text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>

        {place.error && (
          <p className="text-sm text-destructive">
            {place.error instanceof Error ? place.error.message : 'Could not place order'}
          </p>
        )}

        <Button className="w-full" onClick={checkout} disabled={place.isPending || lines.length === 0}>
          {place.isPending ? 'Placing order…' : 'Place order'}
        </Button>
      </DialogContent>
    </Dialog>
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
