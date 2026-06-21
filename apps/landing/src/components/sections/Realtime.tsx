import { motion } from 'framer-motion';
import { BarChart3, CheckCircle2, ChefHat, ConciergeBell, ShoppingBag } from 'lucide-react';
import { Section, SectionHeading } from '../primitives.js';
import { EASE, inView } from '../../lib/anim.js';

const STEPS = [
  { icon: ShoppingBag, title: 'Customer places order', desc: 'From the table via QR' },
  { icon: ChefHat, title: 'Kitchen receives order', desc: 'Instantly on the KDS' },
  { icon: ConciergeBell, title: 'Waiter gets notified', desc: 'Floor stays in sync' },
  { icon: CheckCircle2, title: 'Payment completed', desc: 'Online or at counter' },
  { icon: BarChart3, title: 'Analytics updated', desc: 'Live, no refresh' },
];

export function Realtime() {
  return (
    <Section>
      <SectionHeading
        eyebrow="Real-time operations"
        title={<>Every order <span className="text-accent">moves instantly.</span></>}
        description="One WebSocket-powered pipeline keeps customers, kitchen, floor and analytics perfectly in step."
      />

      <div className="relative mt-16">
        <div aria-hidden className="absolute left-0 right-0 top-[34px] hidden lg:block">
          <div className="relative mx-auto h-px max-w-5xl overflow-hidden bg-border">
            <motion.div
              initial={{ x: '-100%' }}
              whileInView={{ x: '100%' }}
              viewport={{ once: false }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-accent to-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: EASE, delay: i * 0.12 }}
              className="relative flex flex-col items-center text-center"
            >
              <span className="relative z-10 flex h-[68px] w-[68px] items-center justify-center rounded-2xl border border-border bg-card text-accent shadow-sm">
                <s.icon className="h-6 w-6" />
              </span>
              <h3 className="font-display mt-4 text-sm font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
              {i < STEPS.length - 1 && <span aria-hidden className="my-2 text-accent/50 lg:hidden">↓</span>}
            </motion.div>
          ))}
        </div>
      </div>

      <motion.p
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
        {...inView}
        className="mt-12 text-center text-sm text-muted-foreground"
      >
        Powered by Socket.IO rooms per branch &amp; brand — sub-second fan-out, no polling.
      </motion.p>
    </Section>
  );
}
