import { useMemo, useState } from 'react';
import { Clock, Sparkles } from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  cn,
} from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';
import type { Product } from '@feedo/types';
import { useCart } from '../store/cart.js';

/** Variant + add-on selection before adding a product to the cart. */
export function ProductSheet({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const add = useCart((s) => s.add);
  const [variant, setVariant] = useState<string | undefined>(undefined);
  const [addons, setAddons] = useState<string[]>([]);
  const [qty, setQty] = useState(1);

  // Reset selection each time a new product opens.
  const key = product?._id ?? '';
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setVariant(product?.variants?.[0]?.label);
    setAddons([]);
    setQty(1);
  }

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    let price = product.basePrice;
    if (variant) price = product.variants.find((v) => v.label === variant)?.price ?? price;
    price += addons.reduce((s, l) => s + (product.addons.find((a) => a.label === l)?.price ?? 0), 0);
    return price;
  }, [product, variant, addons]);

  if (!product) return null;

  const toggleAddon = (label: string) =>
    setAddons((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]));

  return (
    <Dialog open={Boolean(product)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        {product.image?.url && (
          <img src={product.image.url} alt={product.name} className="h-40 w-full rounded-xl object-cover" />
        )}
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        {product.description && (
          <p className="text-sm text-muted-foreground">{product.description}</p>
        )}

        {((product.prepTimeMinutes ?? 0) > 0 || (product.loyaltyPoints ?? 0) > 0) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {(product.prepTimeMinutes ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> ~{product.prepTimeMinutes} min prep
              </span>
            )}
            {(product.loyaltyPoints ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-accent">
                <Sparkles className="h-3.5 w-3.5" /> Earn {product.loyaltyPoints} pts each
              </span>
            )}
          </div>
        )}

        {product.variants.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Choose size</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.label}
                  onClick={() => setVariant(v.label)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                    variant === v.label ? 'border-foreground bg-foreground/5 font-medium text-foreground' : 'border-border',
                  )}
                >
                  {v.label} · {formatCurrency(v.price)}
                </button>
              ))}
            </div>
          </div>
        )}

        {product.addons.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Add-ons</p>
            <div className="space-y-1.5">
              {product.addons.map((a) => (
                <label key={a.label} className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={addons.includes(a.label)} onChange={() => toggleAddon(a.label)} className="accent-[hsl(var(--accent))]" />
                    {a.label}
                  </span>
                  <span className="text-muted-foreground">+{formatCurrency(a.price)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 rounded-lg border border-border px-2 py-1">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-2 text-lg">−</button>
            <span className="w-6 text-center text-sm font-medium">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} className="px-2 text-lg">+</button>
          </div>
          {product.isVeg !== undefined && (
            <Badge variant={product.isVeg ? 'success' : 'destructive'}>
              {product.isVeg ? 'Veg' : 'Non-veg'}
            </Badge>
          )}
        </div>

        <Button
          className="w-full"
          onClick={() => {
            add(
              {
                productId: product._id,
                name: product.name,
                variantLabel: variant,
                addonLabels: addons,
                unitPrice,
              },
              qty,
            );
            onClose();
          }}
        >
          Add {qty} · {formatCurrency(unitPrice * qty)}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
