import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, ShoppingBag, Star, UtensilsCrossed } from 'lucide-react';
import { Button, Card, EmptyState, Input, Skeleton, ThemeToggle, cn, useTheme } from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';
import type { Product } from '@feedo/types';
import { useMenuByQr, useMenuBySlug } from '../lib/api.js';
import { useCart } from '../store/cart.js';
import { ProductSheet } from '../components/ProductSheet.js';
import { CartSheet } from '../components/CartSheet.js';

export function MenuPage({ mode }: { mode: 'slug' | 'qr' }) {
  const params = useParams();
  const slugQuery = useMenuBySlug(mode === 'slug' ? params.slug : undefined);
  const qrQuery = useMenuByQr(mode === 'qr' ? params.qrToken : undefined);
  const query = mode === 'slug' ? slugQuery : qrQuery;
  const data = query.data;

  const { setAccent } = useTheme();
  const setContext = useCart((s) => s.setContext);
  const count = useCart((s) => s.count());

  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [selected, setSelected] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (!data) return;
    setContext(data.restaurant.slug, data.table?._id ?? null);
    if (data.restaurant.branding?.accent) setAccent(data.restaurant.branding.accent);
  }, [data, setContext, setAccent]);

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-5">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-11 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
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
      <header className="sticky top-0 z-20 bg-background/80 px-5 pt-6 pb-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            {table && <p className="text-xs text-muted-foreground">Dine-in · {table.name}</p>}
            <h1 className="text-lg font-semibold tracking-tight">{restaurant.name}</h1>
          </div>
          <ThemeToggle />
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search dishes…" className="h-11 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  activeCat === c._id ? 'border-transparent bg-foreground text-background' : 'border-border text-muted-foreground',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="grid gap-3">
            {filtered.map((p, i) => (
              <motion.div key={p._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}>
                <Card className="flex items-center gap-3 p-3" onClick={() => setSelected(p)} role="button">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-secondary text-lg font-semibold">
                    {p.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    {p.description && <p className="truncate text-xs text-muted-foreground">{p.description}</p>}
                    <div className="mt-1 flex items-center gap-2">
                      {p.ratingCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 fill-warning text-warning" /> {p.rating}
                        </span>
                      )}
                      <span className="text-sm font-semibold">{formatCurrency(p.basePrice)}</span>
                    </div>
                  </div>
                  <Button size="icon" variant="outline" className="shrink-0 rounded-full" onClick={(e) => { e.stopPropagation(); setSelected(p); }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState icon={UtensilsCrossed} title="Nothing here yet" description="No dishes match — try another category." />
        )}
      </main>

      {count > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed inset-x-0 bottom-5 z-30 mx-auto max-w-md px-5">
          <Button className="h-12 w-full justify-between rounded-xl shadow-elevated" onClick={() => setCartOpen(true)}>
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> {count} item{count > 1 ? 's' : ''}
            </span>
            <span>View cart</span>
          </Button>
        </motion.div>
      )}

      <ProductSheet product={selected} onClose={() => setSelected(null)} />
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} restaurant={restaurant} />
    </div>
  );
}
