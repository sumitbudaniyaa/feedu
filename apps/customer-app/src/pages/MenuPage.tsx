import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift, Search, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { Button, EmptyState, Input, Skeleton, cn, useTheme } from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';
import type { Product } from '@feedo/types';
import { useMenuByQr, useMenuBySlug } from '../lib/api.js';
import { useCart } from '../store/cart.js';
import { ProductSheet } from '../components/ProductSheet.js';
import { ProductCard } from '../components/ProductCard.js';
import { SectionsBlock } from '../components/SectionsBlock.js';

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
  const [vegOnly, setVegOnly] = useState(false);
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
      <div className="mx-auto max-w-md space-y-4">
        <Skeleton className="h-44 w-full rounded-none rounded-b-3xl" />
        <div className="space-y-4 px-5">
          <Skeleton className="h-8 w-1/2" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-2xl" />
            ))}
          </div>
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

  const { restaurant, categories, products, sections, table } = data;
  const browsing = activeCat === 'all' && !search && !vegOnly;
  const filtered = products.filter((p) => {
    const matchesCat = activeCat === 'all' || p.categoryId === activeCat;
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesVeg = !vegOnly || p.isVeg === true;
    return matchesCat && matchesSearch && matchesVeg;
  });

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-24">
      {/* Brand-colored gradient hero — the restaurant's accent lives here, not on buttons. */}
      <header
        className="relative isolate overflow-hidden rounded-b-[2rem] px-5 pb-9 pt-8 text-white"
        style={{
          background:
            'linear-gradient(155deg, hsl(var(--accent)), hsl(var(--accent) / 0.72) 55%, hsl(var(--accent) / 0.55))',
        }}
      >
        {/* soft glows for depth (above the gradient, below the content) */}
        <div className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-black/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold leading-tight tracking-tight">
              {restaurant.name}
            </h1>
            {restaurant.cuisineType && restaurant.cuisineType.length > 0 && (
              <p className="mt-0.5 truncate text-sm text-white/80">
                {restaurant.cuisineType.join(' · ')}
              </p>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/rewards')}
            aria-label="Rewards & orders"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-white/25"
          >
            <Gift className="h-5 w-5" />
          </motion.button>
        </div>

        {table && (
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/15 backdrop-blur">
            <UtensilsCrossed className="h-3.5 w-3.5" /> Dine-in · {table.name}
          </span>
        )}

        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search dishes…"
            className="h-12 rounded-xl border-0 bg-white pl-10 text-foreground shadow-elevated"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <main className="space-y-7 px-5 pt-6">
        {/* Curated sections from the Menu CMS */}
        {browsing && sections.length > 0 && (
          <SectionsBlock sections={sections} products={products} onCustomise={setSelected} />
        )}

        <div className="no-scrollbar sticky top-0 z-10 -mx-5 flex items-center gap-2 overflow-x-auto border-b border-border/60 bg-background/85 px-5 py-2.5 backdrop-blur">
          {/* Veg-only filter */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setVegOnly((v) => !v)}
            aria-pressed={vegOnly}
            className={cn(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
              vegOnly ? 'border-success bg-success/10 text-success' : 'border-border text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'flex h-3.5 w-3.5 items-center justify-center rounded-sm border',
                vegOnly ? 'border-success' : 'border-muted-foreground',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', vegOnly ? 'bg-success' : 'bg-muted-foreground')} />
            </span>
            Veg only
          </motion.button>

          {categories.length > 0 && <span className="h-5 w-px shrink-0 bg-border" />}

          {categories.length > 0 &&
            [{ _id: 'all', name: 'All' }, ...categories].map((c) => (
              <motion.button
                key={c._id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCat(c._id)}
                className={cn(
                  'whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
                  activeCat === c._id
                    ? 'border-transparent bg-foreground text-background shadow-soft'
                    : 'border-border text-muted-foreground hover:border-foreground/30',
                )}
              >
                {c.name}
              </motion.button>
            ))}
        </div>

        <section className="space-y-3">
          {browsing && sections.length > 0 && (
            <h2 className="text-lg font-semibold tracking-tight">Full menu</h2>
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
        </section>
      </main>

      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed inset-x-0 bottom-5 z-30 mx-auto max-w-md px-5"
          >
            <Button
              variant="success"
              className="h-12 w-full justify-between rounded-xl shadow-elevated"
              onClick={() => navigate('/cart')}
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                <motion.span key={count} initial={{ scale: 1.3 }} animate={{ scale: 1 }}>
                  {count} item{count > 1 ? 's' : ''}
                </motion.span>
                · {formatCurrency(subtotal)}
              </span>
              <span>View cart</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <ProductSheet product={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
