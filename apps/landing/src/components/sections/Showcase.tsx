import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Section, SectionHeading, cx } from '../primitives.js';
import { KdsMockup, MiniDashboard, PhoneMockup, WaiterPanel } from '../mockups.js';
// (Feedu's internal platform console is intentionally not shown on the public site.)
import { blurReveal, fadeUp, inView, stagger } from '../../lib/anim.js';

type Item = {
  tag: string;
  title: string;
  desc: string;
  points: string[];
  visual: () => JSX.Element;
};

const ITEMS: Item[] = [
  {
    tag: 'Customer App',
    title: 'Ordering that diners actually enjoy',
    desc: 'Scan, browse, customise and pay — a fast, beautiful PWA with no install required.',
    points: ['QR & link entry', 'Razorpay & cash', 'Live order tracking'],
    visual: () => <PhoneMockup />,
  },
  {
    tag: 'Restaurant Dashboard',
    title: 'The command center for owners',
    desc: 'Every order, table, product and metric in one place — with branch switching built in.',
    points: ['Real-time orders', 'Menu CMS & inventory', 'Revenue analytics'],
    visual: () => <MiniDashboard variant="owner" />,
  },
  {
    tag: 'Kitchen Display',
    title: 'A KDS the line can trust',
    desc: 'Orders arrive instantly with timers and category filters, so prep never stalls.',
    points: ['Live queue', 'Status transitions', 'Category filtering'],
    visual: () => <KdsMockup />,
  },
  {
    tag: 'Waiter App',
    title: 'The floor, connected',
    desc: 'Diners ring the table and waiters respond — calls clear across every device at once.',
    points: ['Live table calls', 'Order visibility', 'Instant acknowledge'],
    visual: () => <WaiterPanel />,
  },
];

function Showpiece({ item, flip }: { item: Item; flip: boolean }) {
  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
      <motion.div variants={stagger} {...inView} className={cx('flex flex-col items-start gap-5', flip && 'lg:order-2')}>
        <motion.span
          variants={fadeUp}
          className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent"
        >
          {item.tag}
        </motion.span>
        <motion.h3 variants={fadeUp} className="font-display text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          {item.title}
        </motion.h3>
        <motion.p variants={fadeUp} className="max-w-md text-base leading-relaxed text-muted-foreground">
          {item.desc}
        </motion.p>
        <motion.ul variants={fadeUp} className="flex flex-col gap-2.5">
          {item.points.map((p) => (
            <li key={p} className="flex items-center gap-2.5 text-sm text-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/12 text-accent">
                <Check className="h-3 w-3" />
              </span>
              {p}
            </li>
          ))}
        </motion.ul>
      </motion.div>

      <motion.div variants={blurReveal} {...inView} className={cx('relative flex justify-center', flip && 'lg:order-1')}>
        <div className="flex w-full max-w-md items-center justify-center rounded-3xl border border-border bg-dots p-6">
          {item.visual()}
        </div>
      </motion.div>
    </div>
  );
}

export function Showcase() {
  return (
    <Section id="product">
      <SectionHeading
        eyebrow="Product showcase"
        title={<>Every surface, <span className="text-accent">one source of truth.</span></>}
        description="Each app is purpose-built for its user — and every one of them reads and writes to the same live data."
      />
      <div className="mt-16 flex flex-col gap-20 md:gap-28">
        {ITEMS.map((item, i) => (
          <Showpiece key={item.tag} item={item} flip={i % 2 === 1} />
        ))}
      </div>
    </Section>
  );
}
