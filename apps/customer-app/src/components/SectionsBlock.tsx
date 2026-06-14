import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Card, cn } from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';
import type { Product, Section } from '@feedo/types';
import { AddControl, ProductCard, ProductImage, useAddProduct } from './ProductCard.js';

interface SectionsBlockProps {
  sections: Section[];
  products: Product[];
  onCustomise: (product: Product) => void;
}

/** Renders the admin-curated Menu CMS sections (carousel / hero / grid). */
export function SectionsBlock({ sections, products, onCustomise }: SectionsBlockProps) {
  const byId = new Map(products.map((p) => [p._id, p]));

  const visible = sections
    .map((s) => ({
      section: s,
      items: s.productIds.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p)),
    }))
    .filter(({ items }) => items.length > 0);

  if (visible.length === 0) return null;

  return (
    <div className="space-y-8">
      {visible.map(({ section, items }, i) => (
        <motion.section
          key={section._id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: Math.min(i * 0.06, 0.3), ease: [0.16, 1, 0.3, 1] }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-accent" />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold tracking-tight">{section.title}</h2>
                {section.subtitle && (
                  <p className="truncate text-xs text-muted-foreground">{section.subtitle}</p>
                )}
              </div>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{items.length} items</span>
          </div>

          {section.layout === 'carousel' && <Carousel items={items} onCustomise={onCustomise} />}
          {section.layout === 'hero' && <Hero items={items} onCustomise={onCustomise} />}
          {section.layout === 'grid' && (
            <div className="grid grid-cols-2 gap-3">
              {items.map((p, idx) => (
                <ProductCard key={p._id} product={p} index={idx} onCustomise={() => onCustomise(p)} />
              ))}
            </div>
          )}
        </motion.section>
      ))}
    </div>
  );
}

function Carousel({ items, onCustomise }: { items: Product[]; onCustomise: (p: Product) => void }) {
  return (
    // First card sits at the page gutter; bleed only to the right so cards peek off-screen.
    <div className="no-scrollbar -mr-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pr-5 pb-2">
      {items.map((p) => (
        <CarouselCard key={p._id} product={p} onCustomise={() => onCustomise(p)} />
      ))}
    </div>
  );
}

function CarouselCard({ product, onCustomise }: { product: Product; onCustomise: () => void }) {
  const { qty } = useAddProduct(product);
  return (
    <Card
      onClick={onCustomise}
      className={cn(
        'group w-40 shrink-0 cursor-pointer snap-start overflow-hidden transition-shadow hover:shadow-card active:scale-[0.99]',
        qty > 0 && 'ring-1 ring-foreground/15',
      )}
    >
      <ProductImage product={product} className="aspect-[4/3]" />
      <div className="space-y-2 p-3">
        <p className="truncate text-sm font-medium leading-snug">{product.name}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{formatCurrency(product.basePrice)}</span>
          <span onClick={(e) => e.stopPropagation()}>
            <AddControl product={product} onCustomise={onCustomise} size="sm" />
          </span>
        </div>
      </div>
    </Card>
  );
}

function Hero({ items, onCustomise }: { items: Product[]; onCustomise: (p: Product) => void }) {
  const [feature, ...rest] = items;
  if (!feature) return null;
  return (
    <div className="space-y-4">
      <Card
        onClick={() => onCustomise(feature)}
        className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-card active:scale-[0.99]"
      >
        <ProductImage product={feature} className="aspect-[16/9]" />
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate font-semibold">{feature.name}</p>
            {feature.description && (
              <p className="truncate text-xs text-muted-foreground">{feature.description}</p>
            )}
            <p className="mt-1 text-sm font-semibold">{formatCurrency(feature.basePrice)}</p>
          </div>
          <span onClick={(e) => e.stopPropagation()}>
            <AddControl product={feature} onCustomise={() => onCustomise(feature)} />
          </span>
        </div>
      </Card>
      {rest.length > 0 && <Carousel items={rest} onCustomise={onCustomise} />}
    </div>
  );
}
