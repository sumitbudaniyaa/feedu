import { motion } from 'framer-motion';
import { Beer, Building2, CakeSlice, Coffee, Pizza, Truck, UtensilsCrossed } from 'lucide-react';
import { Section, SectionHeading, cx } from '../primitives.js';
import { fadeUp, inView, stagger } from '../../lib/anim.js';

// Bento tiles of varying sizes inside one card. Spans tile a 4-col grid exactly:
// one 2x2 feature, two 2-wide, and four singles.
const TYPES = [
  { icon: UtensilsCrossed, title: 'Fine dining', desc: 'Table service, reservations and live seat occupancy.', cls: 'sm:col-span-2 sm:row-span-2', feature: true },
  { icon: Coffee, title: 'Cafés & coffee', desc: 'Counter QR ordering, loyalty and quick turnover.', cls: 'sm:col-span-2', feature: true },
  { icon: Building2, title: 'Multi-branch chains', desc: 'Shared menus, combined billing and branch comparison.', cls: 'sm:col-span-2', feature: true },
  { icon: Beer, title: 'Bars & pubs', cls: '' },
  { icon: Pizza, title: 'Pizzerias & QSR', cls: '' },
  { icon: Truck, title: 'Food trucks', cls: '' },
  { icon: CakeSlice, title: 'Bakeries', cls: '' },
];

export function UseCases() {
  return (
    <Section id="use-cases">
      <SectionHeading title={<>One platform. <br className="hidden sm:block" />Every kind of <span className="text-accent">restaurant</span>.</>} />
      <div className="mt-16 rounded-[1.5rem] border border-border bg-secondary/40 p-3 sm:p-4">
        <motion.div
          variants={stagger}
          {...inView}
          className="grid grid-cols-2 gap-3 [grid-auto-flow:dense] sm:grid-cols-4 sm:auto-rows-[155px]"
        >
          {TYPES.map((t) => (
            <motion.div
              key={t.title}
              variants={fadeUp}
              className={cx(
                'group flex flex-col rounded-2xl border border-border bg-background p-5 transition-colors hover:bg-secondary/40 sm:p-6',
                t.cls,
              )}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-transform group-hover:-translate-y-0.5">
                <t.icon className="h-5 w-5" />
              </span>
              <div className="mt-auto pt-6">
                <h3 className={cx('font-display font-bold tracking-tight', t.feature ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg')}>
                  {t.title}
                </h3>
                {t.feature && t.desc && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.desc}</p>}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}
