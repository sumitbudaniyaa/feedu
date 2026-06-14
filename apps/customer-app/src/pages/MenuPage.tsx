import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift, Search, ShoppingBag, User, UtensilsCrossed } from 'lucide-react';
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

  // Rotating search placeholder — prefers real dish names, falls back to generic terms.
  const searchTerms = useMemo(() => {
    const names = (data?.products ?? []).map((p) => p.name).filter(Boolean);
    const base = names.length >= 3 ? names : ['pizza', 'burger', 'coffee', 'biryani', 'desserts'];
    return base.slice(0, 8);
  }, [data]);
  const [phIndex, setPhIndex] = useState(0);
  useEffect(() => {
    if (searchTerms.length < 2) return;
    const id = setInterval(() => setPhIndex((i) => (i + 1) % searchTerms.length), 2200);
    return () => clearInterval(id);
  }, [searchTerms.length]);

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
  // Curated sections show while browsing "All" with no search — veg mode still shows them,
  // just narrowed to eligible (veg) products so empty sections drop out.
  const browsing = activeCat === 'all' && !search;
  const sectionProducts = vegOnly ? products.filter((p) => p.isVeg === true) : products;
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
        {/* Ambient floating glows for depth (above the gradient, below the content) */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full bg-white/15 blur-3xl"
          animate={{ x: [0, 22, 0], y: [0, 16, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-black/10 blur-3xl"
          animate={{ x: [0, -18, 0], y: [0, -14, 0], scale: [1, 1.18, 1] }}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute right-8 top-2 h-24 w-24 rounded-full bg-white/10 blur-2xl"
          animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.25, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="relative space-y-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Brand wordmark + rewards / account */}
          <div className="flex items-center justify-between gap-3">
            <span className="select-none text-2xl font-black italic leading-none tracking-tight text-white drop-shadow-sm">
              feedo
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05, rotate: -8 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/rewards')}
                aria-label="Rewards"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-white/25"
              >
                <Gift className="h-5 w-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/account')}
                aria-label="Account"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-white/25"
              >
                <User className="h-5 w-5" />
              </motion.button>
            </div>
          </div>

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
        </motion.div>

        {table && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/15 backdrop-blur"
          >
            <UtensilsCrossed className="h-3.5 w-3.5" /> Dine-in · {table.name}
          </motion.span>
        )}

        <motion.div
          className="relative mt-4 flex items-center gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/70" />
            <Input
              aria-label="Search dishes"
              placeholder=""
              className="h-14 rounded-2xl border border-white/25 bg-white/15 pl-11 text-white placeholder:text-white/70 shadow-elevated backdrop-blur-md focus-visible:ring-white/40"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {/* Animated placeholder that cycles dishes while the field is empty. */}
            {search === '' && (
              <div className="pointer-events-none absolute left-11 top-1/2 flex -translate-y-1/2 items-center text-sm text-white/70">
                <span>Search&nbsp;</span>
                <span className="relative inline-flex h-5 items-center overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={searchTerms[phIndex]}
                      initial={{ y: 14, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -14, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="block whitespace-nowrap font-medium text-white"
                    >
                      “{searchTerms[phIndex]}”
                    </motion.span>
                  </AnimatePresence>
                </span>
              </div>
            )}
          </div>
          {/* Veg-only filter — Zomato-style: VEG / MODE label over a simple toggle. */}
          <div className="flex h-14 shrink-0 flex-col items-center justify-center gap-1.5">
            <span className="text-center leading-none">
              <span className="block text-sm font-extrabold tracking-wide text-white">VEG</span>
              <span className="block text-[10px] font-semibold tracking-widest text-white/70">MODE</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={vegOnly}
              aria-label="Veg only"
              onClick={() => setVegOnly((v) => !v)}
              className={cn(
                'relative h-5 w-9 rounded-full transition-colors',
                vegOnly ? 'bg-success' : 'bg-white/40',
              )}
            >
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm',
                  vegOnly ? 'right-0.5' : 'left-0.5',
                )}
              />
            </button>
          </div>
        </motion.div>
      </header>

      <main className="space-y-7 px-5 pt-6">
        {/* Curated sections from the Menu CMS */}
        {browsing && sections.length > 0 && (
          <SectionsBlock sections={sections} products={sectionProducts} onCustomise={setSelected} />
        )}

        {categories.length > 0 && (
          <div className="no-scrollbar sticky top-0 z-10 -mx-5 flex items-center gap-2 overflow-x-auto border-b border-border/60 bg-background/85 px-5 py-2.5 backdrop-blur">
            {[{ _id: 'all', name: 'All' }, ...categories].map((c) => (
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
        )}

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
