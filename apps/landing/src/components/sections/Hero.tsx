import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { ButtonPrimary, cx } from '../primitives.js';
import { EASE, fadeUp, stagger } from '../../lib/anim.js';

const VIEWS = [
  { key: 'owner', label: 'Owner dashboard', src: '/mockups/admin.png' },
  { key: 'kitchen', label: 'Kitchen display', src: '/mockups/kitchen.png' },
] as const;

export function Hero() {
  const [view, setView] = useState(0);
  const active = VIEWS[view]!;

  return (
    <section className="relative overflow-hidden px-5 pt-36 pb-16 sm:px-8 sm:pt-44">
      <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <motion.h1 variants={fadeUp} className="font-serif text-balance text-5xl font-light leading-[1.0] tracking-tight sm:text-6xl md:text-[5.4rem]">
          the operating system for modern <span className="text-accent">restaurants</span>
        </motion.h1>

        <motion.p variants={fadeUp} className="mt-7 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
          Run orders, kitchen, staff, loyalty, analytics and multi-branch operations from one
          platform live, in real time. One scan does the rest.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-9 flex flex-col items-center justify-center gap-5 sm:flex-row sm:flex-wrap">
          <ButtonPrimary href="/contact-sales" className="!min-w-[220px] !justify-between !rounded-[.65rem] !px-6 !py-4 text-base">
            Get started <ArrowRight className="h-4 w-4" />
          </ButtonPrimary>
        </motion.div>
      </motion.div>

      {/* Product screenshot — borderless, full image, larger */}
      <motion.div
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: EASE, delay: 0.25 }}
        className="relative mx-auto mt-16 max-w-5xl"
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={active.key}
            src={active.src}
            alt={`Feedu ${active.label}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="shadow-product block w-full border p-2 rounded-2xl"
          />
        </AnimatePresence>

        {/* segmented toggle */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
            {VIEWS.map((v, i) => (
              <button
                key={v.key}
                onClick={() => setView(i)}
                className={cx(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  i === view ? 'bg-[var(--butter)] text-[hsl(30 25% 12%)]' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
