import { motion } from 'framer-motion';
import {
  BarChart3,
  Bell,
  Boxes,
  ChefHat,
  Gift,
  LayoutGrid,
  Network,
  Receipt,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { Section, SectionHeading, cx } from '../primitives.js';
import { fadeUp, inView, stagger } from '../../lib/anim.js';

type Feature = {
  icon: typeof Receipt;
  title: string;
  desc: string;
  span?: string;
};

const FEATURES: Feature[] = [
  { icon: Receipt, title: 'Orders', desc: 'Dine-in, counter and aggregator orders unified in one live stream with split payments.', span: 'sm:col-span-2' },
  { icon: ChefHat, title: 'Kitchen', desc: 'A real-time KDS with timers, status flow and per-category filtering.' },
  { icon: Boxes, title: 'Inventory', desc: 'Per-branch stock and availability overrides on a shared catalog.' },
  { icon: Users, title: 'Staff', desc: 'Roles, logins and branch-locked managers with granular access.' },
  { icon: LayoutGrid, title: 'Tables', desc: 'QR-mapped tables and live occupancy at a glance.' },
  { icon: Gift, title: 'Loyalty', desc: 'Points, wallets and in-app reward orders that drive repeat visits.', span: 'sm:col-span-2' },
  { icon: BarChart3, title: 'Analytics', desc: 'Revenue, peak hours, AOV, retention and channel mix — all from real data.', span: 'sm:col-span-2' },
  { icon: Bell, title: 'Waiter calls', desc: 'Diners ring the table; staff get notified and respond instantly.' },
  { icon: Network, title: 'Multi-branch', desc: 'One brand, many branches, one combined view and subscription.' },
  { icon: UtensilsCrossed, title: 'Customer insights', desc: 'Spend, visits, favourites and reward history per diner.' },
];

const TINTS = ['tint-green', 'tint-blue', 'tint-butter', 'tint-pink', 'tint-olive', 'tint-lilac'];

function Card({ f, i }: { f: Feature; i: number }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25 }}
      className={cx('group rounded-3xl border border-black/[0.04] p-6', TINTS[i % TINTS.length], f.span)}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-foreground shadow-sm">
        <f.icon className="h-5 w-5" />
      </span>
      <h3 className="font-display mt-4 text-xl font-bold tracking-tight">{f.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground/65">{f.desc}</p>
    </motion.div>
  );
}

export function Bento() {
  return (
    <Section id="features">
      <SectionHeading
        eyebrow="One platform · every workflow"
        title={<>Everything you need to run a <span className="text-accent">modern restaurant.</span></>}
        description="Ten core systems that usually need ten different tools — built into a single operating system that talks to itself in real time."
      />
      <motion.div variants={stagger} {...inView} className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <Card key={f.title} f={f} i={i} />
        ))}
      </motion.div>
    </Section>
  );
}
