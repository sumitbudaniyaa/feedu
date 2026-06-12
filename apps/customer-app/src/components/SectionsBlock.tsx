import { motion } from 'framer-motion';
import { Card } from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';
import type { Product, Section } from '@feedo/types';
import { AddControl, ProductCard, ProductImage } from './ProductCard.js';

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
    <div className="space-y-7">
      {visible.map(({ section, items }, i) => (
        <motion.section
          key={section._id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: Math.min(i * 0.06, 0.3), ease: [0.16, 1, 0.3, 1] }}
          className="space-y-3"
        >
          <div>
            <h2 className="text-base font-semibold tracking-tight">{section.title}</h2>
            {section.subtitle && <p className="text-xs text-muted-foreground">{section.subtitle}</p>}
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
    <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1">
      {items.map((p) => (
        <Card key={p._id} className="group w-36 shrink-0 snap-start overflow-hidden">
          <ProductImage product={p} className="aspect-square" />
          <div className="space-y-1.5 p-2.5">
            <p className="truncate text-xs font-medium">{p.name}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">{formatCurrency(p.basePrice)}</span>
              <AddControl product={p} onCustomise={() => onCustomise(p)} size="sm" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Hero({ items, onCustomise }: { items: Product[]; onCustomise: (p: Product) => void }) {
  const [feature, ...rest] = items;
  if (!feature) return null;
  return (
    <div className="space-y-3">
      <Card className="group overflow-hidden">
        <ProductImage product={feature} className="aspect-[2/1]" />
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate font-semibold">{feature.name}</p>
            {feature.description && (
              <p className="truncate text-xs text-muted-foreground">{feature.description}</p>
            )}
            <p className="mt-1 text-sm font-semibold">{formatCurrency(feature.basePrice)}</p>
          </div>
          <AddControl product={feature} onCustomise={() => onCustomise(feature)} />
        </div>
      </Card>
      {rest.length > 0 && <Carousel items={rest} onCustomise={onCustomise} />}
    </div>
  );
}
