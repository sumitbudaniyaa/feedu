import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Minus, Plus, Sparkles, X } from 'lucide-react';
import { Button, cn } from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';
import type { Product } from '@feedo/types';
import { useCart } from '../store/cart.js';
import { FavoriteButton } from '../store/favorites.js';

/** Full-detail bottom sheet: shows everything about a product and its order options. */
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

  const toggleAddon = (label: string) =>
    setAddons((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]));

  return (
    <AnimatePresence>
      {product && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
              }
            }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92vh] max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-elevated"
          >
            {/* Scrollable content */}
            <div className="no-scrollbar flex-1 overflow-y-auto">
              {/* Hero image (or gradient placeholder) */}
              <div className="relative">
                {product.image?.url ? (
                  <img src={product.image.url} alt={product.name} className="h-56 w-full object-cover" />
                ) : (
                  <div
                    className="flex h-44 w-full items-center justify-center text-5xl font-bold text-white"
                    style={{
                      background:
                        'linear-gradient(150deg, hsl(var(--accent)), hsl(var(--accent) / 0.6))',
                    }}
                  >
                    {product.name[0]}
                  </div>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-soft backdrop-blur transition-colors hover:bg-background"
                >
                  <X className="h-5 w-5" />
                </button>
                <FavoriteButton productId={product._id} tone="light" className="absolute right-14 top-3" />
                {product.isVeg !== undefined && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-soft backdrop-blur">
                    <span
                      className={cn(
                        'flex h-3.5 w-3.5 items-center justify-center rounded-sm border',
                        product.isVeg ? 'border-success' : 'border-destructive',
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', product.isVeg ? 'bg-success' : 'bg-destructive')} />
                    </span>
                    {product.isVeg ? 'Veg' : 'Non-veg'}
                  </span>
                )}
              </div>

              <div className="space-y-5 p-5">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">{product.name}</h2>
                  <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(product.basePrice)}</p>
                  {product.description && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
                  )}
                </div>

                {((product.prepTimeMinutes ?? 0) > 0 || (product.loyaltyPoints ?? 0) > 0) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {(product.prepTimeMinutes ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> ~{product.prepTimeMinutes} min prep
                      </span>
                    )}
                    {(product.loyaltyPoints ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
                        <Sparkles className="h-3.5 w-3.5" /> Earn {product.loyaltyPoints} pts each
                      </span>
                    )}
                  </div>
                )}

                {product.variants.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Choose size</p>
                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((v) => (
                        <button
                          key={v.label}
                          onClick={() => setVariant(v.label)}
                          className={cn(
                            'rounded-xl border px-3.5 py-2 text-sm transition-colors',
                            variant === v.label
                              ? 'border-foreground bg-foreground/5 font-medium text-foreground'
                              : 'border-border text-muted-foreground hover:border-foreground/30',
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
                    <p className="text-sm font-semibold">Add-ons</p>
                    <div className="space-y-2">
                      {product.addons.map((a) => (
                        <label
                          key={a.label}
                          className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-3.5 py-2.5 text-sm transition-colors hover:bg-secondary/50"
                        >
                          <span className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={addons.includes(a.label)}
                              onChange={() => toggleAddon(a.label)}
                              className="h-4 w-4 accent-[hsl(var(--accent))]"
                            />
                            {a.label}
                          </span>
                          <span className="text-muted-foreground">+{formatCurrency(a.price)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky footer: quantity + add */}
            <div className="flex items-center gap-3 border-t border-border bg-card p-4 pb-6">
              <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border px-1.5 py-1.5">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-8 w-8 items-center justify-center"
                  aria-label="Decrease"
                >
                  <Minus className="h-4 w-4" />
                </motion.button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums">{qty}</span>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setQty((q) => q + 1)}
                  className="flex h-8 w-8 items-center justify-center"
                  aria-label="Increase"
                >
                  <Plus className="h-4 w-4" />
                </motion.button>
              </div>
              <Button
                variant="success"
                className="h-12 flex-1 justify-between rounded-xl"
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
                <span>Add {qty} to order</span>
                <span>{formatCurrency(unitPrice * qty)}</span>
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
