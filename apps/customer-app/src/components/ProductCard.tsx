import { motion } from 'framer-motion';
import { Clock, Minus, Plus, Sparkles } from 'lucide-react';
import { Button, Card, cn } from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';
import type { Product } from '@feedo/types';
import { useCart } from '../store/cart.js';
import { FavoriteButton } from '../store/favorites.js';

/** Cart-aware add logic shared by every product surface. */
export function useAddProduct(product: Product) {
  const incSimple = useCart((s) => s.incSimple);
  const decSimple = useCart((s) => s.decSimple);
  const qty = useCart((s) => s.productQty(product._id));
  const hasOptions = product.variants.length > 0 || product.addons.length > 0;

  const addSimple = () =>
    incSimple({ productId: product._id, name: product.name, addonLabels: [], unitPrice: product.basePrice });

  return { qty, hasOptions, addSimple, dec: () => decSimple(product._id) };
}

export function VegDot({ isVeg }: { isVeg?: boolean }) {
  if (isVeg === undefined) return null;
  return (
    <span
      className={cn(
        'flex h-4 w-4 items-center justify-center rounded-sm border bg-background',
        isVeg ? 'border-success' : 'border-destructive',
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', isVeg ? 'bg-success' : 'bg-destructive')} />
    </span>
  );
}

export function ProductImage({ product, className }: { product: Product; className?: string }) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-secondary text-2xl font-semibold text-muted-foreground',
        className,
      )}
    >
      {product.image?.url ? (
        <img
          src={product.image.url}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        product.name[0]
      )}
      <span className="absolute left-2 top-2">
        <VegDot isVeg={product.isVeg} />
      </span>
      <FavoriteButton productId={product._id} className="absolute right-2 top-2" />
    </div>
  );
}

/** Stepper / Add control rendered on cards. */
export function AddControl({
  product,
  onCustomise,
  size = 'md',
}: {
  product: Product;
  onCustomise: () => void;
  size?: 'sm' | 'md';
}) {
  const { qty, hasOptions, addSimple, dec } = useAddProduct(product);
  const h = size === 'sm' ? 'h-7' : 'h-8';

  if (qty === 0) {
    return (
      <motion.div whileTap={{ scale: 0.92 }}>
        <Button
          size="sm"
          variant="outline"
          className={cn(h, 'rounded-lg px-3')}
          onClick={() => (hasOptions ? onCustomise() : addSimple())}
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </motion.div>
    );
  }
  if (hasOptions) {
    return (
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onCustomise}
        className={cn(h, 'flex items-center gap-1 rounded-lg border border-foreground bg-foreground px-2 text-sm font-semibold text-background')}
      >
        <motion.span key={qty} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="tabular-nums">
          {qty}
        </motion.span>
        <Plus className="h-3.5 w-3.5" />
      </motion.button>
    );
  }
  return (
    <div className={cn(h, 'flex items-center gap-2 rounded-lg border border-foreground bg-foreground px-1.5 text-background')}>
      <motion.button whileTap={{ scale: 0.8 }} onClick={dec} className="px-1">
        <Minus className="h-3.5 w-3.5" />
      </motion.button>
      <motion.span key={qty} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="w-4 text-center text-sm font-semibold tabular-nums">
        {qty}
      </motion.span>
      <motion.button whileTap={{ scale: 0.8 }} onClick={addSimple} className="px-1">
        <Plus className="h-3.5 w-3.5" />
      </motion.button>
    </div>
  );
}

/** Standard 2-column grid card. */
export function ProductCard({
  product,
  index,
  onCustomise,
}: {
  product: Product;
  index: number;
  onCustomise: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Tapping anywhere on the card opens the full product detail sheet. */}
      <Card
        onClick={onCustomise}
        className="group flex h-full cursor-pointer flex-col overflow-hidden transition-shadow hover:shadow-card active:scale-[0.99]"
      >
        <ProductImage product={product} className="aspect-square" />
        <div className="flex flex-1 flex-col p-3">
          <p className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            {product.prepTimeMinutes != null && product.prepTimeMinutes > 0 && (
              <span className="flex items-center gap-0.5">
                <Clock className="h-3 w-3" /> {product.prepTimeMinutes} min
              </span>
            )}
            {product.loyaltyPoints != null && product.loyaltyPoints > 0 && (
              <span className="flex items-center gap-0.5 text-accent">
                <Sparkles className="h-3 w-3" /> +{product.loyaltyPoints} pts
              </span>
            )}
          </div>
          <div className="mt-auto flex items-center justify-between pt-3">
            <span className="text-sm font-semibold">{formatCurrency(product.basePrice)}</span>
            {/* Quick-add shouldn't trigger the card's open-sheet tap. */}
            <span onClick={(e) => e.stopPropagation()}>
              <AddControl product={product} onCustomise={onCustomise} />
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
