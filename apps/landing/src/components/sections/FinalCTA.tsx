import { motion } from 'framer-motion';
import { UtensilsCrossed } from 'lucide-react';
import { fadeUp, inView, stagger } from '../../lib/anim.js';
import { ButtonPrimary } from '../primitives.js';

export function FinalCTA() {
  return (
    <section id="contact" className="px-4 py-10 sm:px-6">
      <motion.div
        variants={stagger}
        {...inView}
        className="grain relative overflow-hidden rounded-[2.5rem] bg-[var(--ink)] px-6 py-20 text-white sm:px-14 md:py-28"
      >
        {/* faint oversized mark */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-4 bottom-0 select-none text-[18rem] font-black italic leading-none text-white/[0.03]"
        >
          feedu
        </span>

        <div className="relative max-w-2xl">
          <motion.h2
            variants={fadeUp}
            className="font-serif text-balance text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl md:text-6xl"
          >
            Need a POS, kitchen display, loyalty and analytics?{' '}
          </motion.h2>
          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-wrap items-center gap-4 text-sm font-semibold"
          >
            <ButtonPrimary href="/contact-sales" className="w-fit">
              Get a call back
            </ButtonPrimary>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
