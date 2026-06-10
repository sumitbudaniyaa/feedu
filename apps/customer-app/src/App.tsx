import { motion } from 'framer-motion';
import { Search, Sparkles, Star, Plus, ShoppingBag } from 'lucide-react';
import { Badge, Button, Card, Input, ThemeToggle, cn } from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';
import { useState } from 'react';

// Placeholder menu — replaced by live restaurant data via QR in Phase 2.
const categories = ['All', 'Trending', 'Mains', 'Starters', 'Drinks', 'Desserts'];
const products = [
  { name: 'Butter Chicken', subtitle: 'Creamy tomato gravy', price: 320, rating: 4.7, tag: 'Bestseller' },
  { name: 'Paneer Tikka', subtitle: 'Char-grilled, smoky', price: 280, rating: 4.6 },
  { name: 'Masala Chai', subtitle: 'Slow-brewed', price: 60, rating: 4.9, tag: "Today's Best" },
  { name: 'Gulab Jamun', subtitle: 'Warm, two pieces', price: 90, rating: 4.8 },
];

export function App() {
  const [active, setActive] = useState('All');
  const [cart, setCart] = useState(0);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 px-5 pt-6 pb-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Dine-in · Table 12</p>
            <h1 className="text-lg font-semibold tracking-tight">The Copper Kitchen</h1>
          </div>
          <ThemeToggle />
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search dishes…" className="h-11 pl-9" />
        </div>
      </header>

      <main className="space-y-6 px-5 pt-2">
        {/* Loyalty widget */}
        <Card className="flex items-center gap-3 border-accent/30 bg-accent/5 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">1 order away from a free dessert</p>
            <p className="text-xs text-muted-foreground">240 reward points available</p>
          </div>
        </Card>

        {/* Featured banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-secondary to-card p-6"
        >
          <Badge variant="accent" className="mb-2">
            Chef Special
          </Badge>
          <h2 className="text-lg font-semibold">Weekend Thali Feast</h2>
          <p className="mt-1 text-sm text-muted-foreground">A curated 7-course journey.</p>
        </motion.div>

        {/* Categories */}
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={cn(
                'whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                active === c
                  ? 'border-transparent bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Products */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Today&apos;s Best</h3>
          <div className="grid gap-3">
            {products.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
              >
                <Card className="flex items-center gap-3 p-3">
                  <div className="h-16 w-16 shrink-0 rounded-xl bg-secondary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      {p.tag && (
                        <Badge variant="accent" className="shrink-0">
                          {p.tag}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{p.subtitle}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        {p.rating}
                      </span>
                      <span className="text-sm font-semibold">{formatCurrency(p.price)}</span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    className="shrink-0 rounded-full"
                    onClick={() => setCart((n) => n + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* Floating cart */}
      {cart > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-x-0 bottom-5 z-30 mx-auto max-w-md px-5"
        >
          <Button className="h-12 w-full justify-between rounded-xl shadow-elevated">
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              {cart} item{cart > 1 ? 's' : ''}
            </span>
            <span>View cart</span>
          </Button>
        </motion.div>
      )}
    </div>
  );
}
