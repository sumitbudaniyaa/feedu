import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Minus, Plus, Search, ShoppingBag, Star, UtensilsCrossed } from 'lucide-react';
import { Button, Card, EmptyState, Input, Skeleton, cn, useTheme } from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';
import type { Product } from '@feedo/types';
import { useMenuByQr, useMenuBySlug } from '../lib/api.js';
import { useCart } from '../store/cart.js';
import { ProductSheet } from '../components/ProductSheet.js';

export function MenuPage({ mode }: { mode: 'slug' | 'qr' }) {
  const params = useParams();
  const navigate = useNavigate();
  const slugQuery = useMenuBySlug(mode === 'slug' ? params.slug : undefined);
  const qrQuery = useMenuByQr(mode === 'qr' ? params.qrToken : undefined);
  const query = mode === 'slug' ? slugQuery : qrQuery;
  const data = query.data;

  const { setAccent } = useTheme();
  const setContext = useCart((s) => s.setContext);
  const count = useCart((s) => s.count());
  const subtotal = useCart((s) => s.subtotal());

  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [selected, setSelected] = useState<Product | null>(null);

  useEffect(() => {
    if (!data) return;
    const menuPath = mode === 'qr' ? `/t/${params.qrToken}` : `/r/${data.restaurant.slug}`;
    setContext(
      {
        slug: data.restaurant.slug,
        name: data.restaurant.name,
        gstPercent: data.restaurant.tax?.gstPercent ?? 5,
        inclusive: data.restaurant.tax?.inclusive ?? false,
        accent: data.restaurant.branding?.accent,
      },
      data.table?._id ?? null,
      menuPath,
    );
    if (data.restaurant.branding?.accent) setAccent(data.restaurant.branding.accent);
  }, [data, mode, params.qrToken, setContext, setAccent]);

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-5">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-11 w-full" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (query.isError || !data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6">
        <EmptyState icon={UtensilsCrossed} title="Restaurant not found" description="This link or QR code may be inactive." />
      </div>
    );
  }

  const { restaurant, categories, products, table } = data;
  const filtered = products.filter((p) => {
    const matchesCat = activeCat === 'all' || p.categoryId === activeCat;
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-24">
      {/* Brand-colored gradient hero — the restaurant's accent lives here, not on buttons. */}
      <header
        className="rounded-b-3xl px-5 pb-6 pt-9 text-white"
        style={{
          background:
            'linear-gradient(160deg, hsl(var(--accent)), hsl(var(--accent) / 0.78) 60%, hsl(var(--accent) / 0.6))',
        }}
      >
        {table && <p className="text-xs font-medium text-white/85">Dine-in · {table.name}</p>}
        <h1 className="text-2xl font-bold tracking-tight">{restaurant.name}</h1>
        {restaurant.cuisineType && restaurant.cuisineType.length > 0 && (
          <p className="mt-0.5 text-sm text-white/85">{restaurant.cuisineType.join(' · ')}</p>
        )}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search dishes…"
            className="h-11 border-0 bg-white pl-9 text-foreground shadow-soft"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <main className="space-y-5 px-5 pt-2">
        {categories.length > 0 && (
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {[{ _id: 'all', name: 'All' }, ...categories].map((c) => (
              <button
                key={c._id}
                onClick={() => setActiveCat(c._id)}
                className={cn(
                  'whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  activeCat === c._id
                    ? 'border-transparent bg-foreground text-background'
                    : 'border-border text-muted-foreground',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p, i) => (
              <ProductCard key={p._id} product={p} index={i} onCustomise={() => setSelected(p)} />
            ))}
          </div>
        ) : (
          <EmptyState icon={UtensilsCrossed} title="Nothing here yet" description="No dishes match — try another category." />
        )}
      </main>

      {count > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed inset-x-0 bottom-5 z-30 mx-auto max-w-md px-5">
          <Button variant="success" className="h-12 w-full justify-between rounded-xl shadow-elevated" onClick={() => navigate('/cart')}>
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> {count} item{count > 1 ? 's' : ''} · {formatCurrency(subtotal)}
            </span>
            <span>View cart</span>
          </Button>
        </motion.div>
      )}

      <ProductSheet product={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ProductCard({
  product,
  index,
  onCustomise,
}: {
  product: Product;
  index: number;
  onCustomise: () => void;
}) {
  const incSimple = useCart((s) => s.incSimple);
  const decSimple = useCart((s) => s.decSimple);
  const qty = useCart((s) => s.productQty(product._id));
  const hasOptions = product.variants.length > 0 || product.addons.length > 0;

  const addSimple = () =>
    incSimple({ productId: product._id, name: product.name, addonLabels: [], unitPrice: product.basePrice });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.3) }}>
      <Card className="flex h-full flex-col overflow-hidden">
        <div className="relative flex aspect-square items-center justify-center bg-secondary text-2xl font-semibold text-muted-foreground">
          {product.image?.url ? (
            <img src={product.image.url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            product.name[0]
          )}
          {product.isVeg !== undefined && (
            <span
              className={cn(
                'absolute left-2 top-2 flex h-4 w-4 items-center justify-center rounded-sm border bg-background',
                product.isVeg ? 'border-success' : 'border-destructive',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', product.isVeg ? 'bg-success' : 'bg-destructive')} />
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3">
          <p className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</p>
          {product.ratingCount > 0 && (
            <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-warning text-warning" /> {product.rating} ({product.ratingCount})
            </span>
          )}

          <div className="mt-auto flex items-center justify-between pt-3">
            <span className="text-sm font-semibold">{formatCurrency(product.basePrice)}</span>

            {qty === 0 ? (
              <Button size="sm" variant="outline" className="h-8 rounded-lg px-3" onClick={() => (hasOptions ? onCustomise() : addSimple())}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            ) : hasOptions ? (
              <button
                onClick={onCustomise}
                className="flex h-8 items-center gap-1 rounded-lg border border-foreground bg-foreground px-2 text-sm font-semibold text-background"
              >
                <span className="tabular-nums">{qty}</span>
                <Plus className="h-3.5 w-3.5" />
              </button>
            ) : (
              <div className="flex h-8 items-center gap-2 rounded-lg border border-foreground bg-foreground px-1.5 text-background">
                <button onClick={() => decSimple(product._id)} className="px-1">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-4 text-center text-sm font-semibold tabular-nums">{qty}</span>
                <button onClick={addSimple} className="px-1">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          {hasOptions && qty > 0 && (
            <p className="pt-1 text-[10px] text-muted-foreground">Customisable · edit in cart</p>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
