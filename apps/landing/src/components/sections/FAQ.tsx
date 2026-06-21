import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Section, SectionHeading, cx } from '../primitives.js';
import { EASE, fadeUp, inView, stagger } from '../../lib/anim.js';

const FAQS = [
  {
    q: 'How long does setup take?',
    a: 'Most restaurants are live within a day. You add your menu, generate table QR codes, and start taking orders — no hardware required beyond the devices you already have.',
  },
  {
    q: 'How do payments work?',
    a: 'Diners pay online via Razorpay or at the counter (cash, UPI, card). Owners can record split payments, and every transaction is reconciled automatically against the order.',
  },
  {
    q: 'Does Feedu support multiple locations?',
    a: 'Yes. A brand can run unlimited branches with shared menus and loyalty, per-branch overrides, branch comparison, and one combined dashboard and subscription.',
  },
  {
    q: 'How does the loyalty program work?',
    a: 'Diners earn points per order and redeem them as in-app reward orders — added straight to the cart as a ₹0 item. Points, expiry and rewards are all configurable per brand.',
  },
  {
    q: 'Is the kitchen system real-time?',
    a: 'Orders appear on the Kitchen Display the instant they are placed, with prep timers and category filtering. Status changes fan out live to staff and customer tracking.',
  },
  {
    q: 'What support do you offer?',
    a: 'Email support on every plan, priority support for growing brands, and a dedicated success manager with custom SLAs for enterprise. In-app support tickets are built in.',
  },
];

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div variants={fadeUp} className="card-warm overflow-hidden rounded-2xl">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="text-sm font-semibold sm:text-base">{q}</span>
        <span
          className={cx(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border transition-transform duration-300',
            open && 'rotate-45 border-accent bg-accent text-accent-foreground',
          )}
        >
          <Plus className="h-4 w-4" />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQ() {
  return (
    <Section id="faq" className="max-w-3xl">
      <SectionHeading eyebrow="FAQ" title={<>Questions, <span className="text-accent">answered.</span></>} />
      <motion.div variants={stagger} {...inView} className="mt-12 flex flex-col gap-3">
        {FAQS.map((f) => (
          <Item key={f.q} {...f} />
        ))}
      </motion.div>
    </Section>
  );
}
