import { motion } from 'framer-motion';
import { Clock, Gift, Repeat, TrendingUp, Trophy, Users, Wallet } from 'lucide-react';
import { Section, SectionHeading, cx } from '../primitives.js';
import { fadeUp, inView, stagger } from '../../lib/anim.js';

const ACCENT = '#C2410C'; // terracotta

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${40 - (v / max) * 36}`).join(' ');
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-12 w-full">
      <motion.polyline
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
        points={pts}
        fill="none"
        stroke={ACCENT}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Metric = {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  delta?: string;
  chart?: 'spark' | 'bars' | 'ring';
  data?: number[];
  span?: string;
};

const METRICS: Metric[] = [
  { icon: TrendingUp, label: 'Revenue growth', value: '+24.6%', delta: 'vs last month', chart: 'spark', data: [20, 35, 28, 50, 42, 64, 58, 80], span: 'sm:col-span-2' },
  { icon: Clock, label: 'Peak hours', value: '7–9 PM', delta: 'busiest window', chart: 'bars', data: [30, 45, 60, 85, 95, 70] },
  { icon: Repeat, label: 'Table turnover', value: '3.4×', delta: 'per day' },
  { icon: Users, label: 'Customer retention', value: '61%', chart: 'ring' },
  { icon: Trophy, label: 'Top product', value: 'Margherita', delta: '1,204 sold' },
  { icon: Wallet, label: 'Loyalty wallet', value: '₹4.2L', delta: 'points outstanding', chart: 'spark', data: [40, 38, 52, 48, 66, 72, 90], span: 'sm:col-span-2' },
  { icon: Gift, label: 'Rewards redeemed', value: '2,118', delta: 'this quarter' },
  { icon: Repeat, label: 'Repeat customers', value: '8,940', delta: '+12% MoM' },
];

function MiniBars({ values }: { values: number[] }) {
  return (
    <div className="flex h-12 items-end gap-1">
      {values.map((v, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          whileInView={{ height: `${v}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: i * 0.05 }}
          className="flex-1 rounded-t bg-accent"
        />
      ))}
    </div>
  );
}

function Ring() {
  return (
    <div className="relative h-12 w-12">
      <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(38 26% 85%)" strokeWidth="4" />
        <motion.circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke={ACCENT}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="94"
          initial={{ strokeDashoffset: 94 }}
          whileInView={{ strokeDashoffset: 94 * 0.39 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  );
}

function Card({ m }: { m: Metric }) {
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -3 }} className={cx('card-warm rounded-3xl p-5', m.span)}>
      <div className="flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-accent">
          <m.icon className="h-4 w-4" />
        </span>
        {m.chart === 'ring' && <Ring />}
      </div>
      <p className="font-display mt-4 text-2xl font-semibold tracking-tight">{m.value}</p>
      <p className="text-xs text-muted-foreground">{m.label}</p>
      {m.delta && <p className="mt-0.5 text-[11px] font-medium text-accent">{m.delta}</p>}
      {m.chart === 'spark' && m.data && <div className="mt-3"><Sparkline values={m.data} /></div>}
      {m.chart === 'bars' && m.data && <div className="mt-3"><MiniBars values={m.data} /></div>}
    </motion.div>
  );
}

export function Analytics() {
  return (
    <Section>
      <SectionHeading
        eyebrow="Analytics & loyalty"
        title={<>Turn data into <span className="text-accent">growth.</span></>}
        description="Every transaction feeds live dashboards and a loyalty engine that brings diners back."
      />
      <motion.div variants={stagger} {...inView} className="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {METRICS.map((m) => (
          <Card key={m.label} m={m} />
        ))}
      </motion.div>
    </Section>
  );
}
