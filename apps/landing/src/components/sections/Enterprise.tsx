import { motion } from 'framer-motion';
import { BarChart3, ClipboardCheck, Gift, Timer, TrendingUp, Wallet } from 'lucide-react';
import { fadeUp, inView, stagger } from '../../lib/anim.js';

const ITEMS = [
  { icon: Timer, title: 'Turn tables faster.', desc: 'Diners order the moment they sit down — no waiting to flag a waiter.' },
  { icon: ClipboardCheck, title: 'Fewer wrong orders.', desc: 'Orders go straight from the table to the kitchen, exactly as entered.' },
  { icon: TrendingUp, title: 'Bigger average bills.', desc: 'Photo menus, combos and gentle upsells nudge guests to add more.' },
  { icon: Gift, title: 'Regulars who come back.', desc: 'Built-in loyalty, rewards and offers bring guests through the door again.' },
  { icon: Wallet, title: 'Get paid, your way.', desc: 'Guests pay from their phone — cash, card or online, split if they like.' },
  { icon: BarChart3, title: 'Know what sells.', desc: 'Live sales, best-sellers and peak hours — see what’s working at a glance.' },
];

export function Enterprise() {
  return (
    <section className="px-4 py-10 sm:px-6">
      <div className="grain relative overflow-hidden rounded-[2.5rem] bg-[var(--ink)] px-6 py-16 text-white sm:px-12 md:py-24">
        <motion.div variants={stagger} {...inView} className="relative grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-end">
          <motion.h2 variants={fadeUp} className="font-display text-balance text-4xl font-bold leading-[1.04] tracking-tight sm:text-5xl md:text-6xl">
            More tables. Bigger bills. Happier guests.
          </motion.h2>
          <motion.p variants={fadeUp} className="max-w-md text-base leading-relaxed text-white/60 lg:justify-self-end">
            Feedu takes care of the busywork so your team can focus on service — and every shift
            runs a little smoother than the last.
          </motion.p>
        </motion.div>

        <div className="relative my-10 h-px w-full bg-white/10" />

        <motion.div variants={stagger} {...inView} className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ITEMS.map((it) => (
            <motion.div key={it.title} variants={fadeUp} className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white/90">
                <it.icon className="h-5 w-5" />
              </span>
              <h3 className="font-serif mt-8 text-2xl font-medium tracking-tight">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{it.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
