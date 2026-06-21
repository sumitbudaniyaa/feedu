import { motion } from 'framer-motion';
import { fadeUp, inView } from '../../lib/anim.js';

// Fictional restaurant-brand names (no real client logos to misrepresent).
const BRANDS = ['Spicebox', 'Crust & Co', 'Verde', 'Brew Lab', 'Tandoor 21', 'Olive Tree'];

export function Logos() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-8 pt-4 sm:px-8">
      <motion.p
        variants={fadeUp}
        {...inView}
        className="mb-6 text-center text-sm font-medium text-muted-foreground"
      >
        Trusted by growing restaurant brands
      </motion.p>
      <motion.div
        variants={fadeUp}
        {...inView}
        className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card/60 sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0"
      >
        {BRANDS.map((b) => (
          <div key={b} className="flex items-center justify-center px-4 py-7">
            <span className="font-serif text-xl font-medium text-foreground/45 transition-colors hover:text-foreground">
              {b}
            </span>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
