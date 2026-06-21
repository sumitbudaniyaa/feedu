import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import { Section } from '../primitives.js';
import { fadeUp, inView, stagger } from '../../lib/anim.js';

export function Testimonial() {
  return (
    <Section>
      <motion.div variants={stagger} {...inView} className="card-warm mx-auto max-w-3xl rounded-3xl p-8 text-center sm:p-12">
        <motion.span variants={fadeUp} className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Quote className="h-6 w-6" />
        </motion.span>
        <motion.p variants={fadeUp} className="font-display mt-6 text-balance text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
          “We replaced three tools with Feedu. Orders, kitchen and payments finally talk to each
          other — and we can see every branch from one screen.”
        </motion.p>
        <motion.div variants={fadeUp} className="mt-6 flex items-center justify-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-semibold">A</span>
          <div className="text-left">
            <p className="text-sm font-semibold">Aarav Mehta</p>
            <p className="text-xs text-muted-foreground">Owner, Spicebox (4 branches)</p>
          </div>
        </motion.div>
      </motion.div>
    </Section>
  );
}
