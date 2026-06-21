import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, ChefHat, ConciergeBell, Smartphone } from 'lucide-react';
import { Section, SectionHeading, cx } from '../primitives.js';
import { KdsMockup, MiniDashboard, PhoneMockup, WaiterPanel } from '../mockups.js';
import { EASE } from '../../lib/anim.js';

type Role = {
  key: string;
  icon: typeof ChefHat;
  title: string;
  blurb: string;
  preview: () => JSX.Element;
};

const ROLES: Role[] = [
  {
    key: 'customers',
    icon: Smartphone,
    title: 'Customers',
    blurb: 'QR ordering, rewards and payments — straight from the table, no app install.',
    preview: () => <PhoneMockup />,
  },
  {
    key: 'waiters',
    icon: ConciergeBell,
    title: 'Waiters',
    blurb: 'Live table calls and order visibility so the floor never misses a beat.',
    preview: () => <WaiterPanel />,
  },
  {
    key: 'kitchen',
    icon: ChefHat,
    title: 'Kitchen staff',
    blurb: 'A focused order queue with timers and one-tap preparation flow.',
    preview: () => <KdsMockup />,
  },
  {
    key: 'owners',
    icon: Building2,
    title: 'Restaurant owners',
    blurb: 'Analytics, inventory, seat occupancy and staff control across every branch.',
    preview: () => <MiniDashboard variant="owner" />,
  },
];

export function Roles() {
  const [active, setActive] = useState(0);
  const role = ROLES[active]!;

  return (
    <Section id="roles">
      <SectionHeading
        eyebrow="Built for every role"
        title={<>One system for <span className="text-accent">everyone</span> in your restaurant.</>}
        description="From the diner at the table to the owner running every branch — every role gets a purpose-built surface."
      />

      <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-center">
        <div className="flex flex-col gap-3">
          {ROLES.map((r, i) => {
            const selected = i === active;
            return (
              <button
                key={r.key}
                onClick={() => setActive(i)}
                className={cx(
                  'group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300',
                  selected ? 'border-accent/40 bg-card shadow-sm' : 'border-border bg-transparent hover:bg-card/60',
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="role-active"
                    className="absolute inset-y-0 left-0 w-1 bg-accent"
                    transition={{ duration: 0.3, ease: EASE }}
                  />
                )}
                <div className="flex items-center gap-4">
                  <span
                    className={cx(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
                      selected ? 'bg-accent text-accent-foreground' : 'bg-secondary text-foreground/70',
                    )}
                  >
                    <r.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold tracking-tight">{r.title}</h3>
                    <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{r.blurb}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* dark mockup, framed on warm paper */}
        <div className="relative flex min-h-[440px] items-center justify-center rounded-3xl border border-border bg-dots p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={role.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="w-full max-w-md"
            >
              {role.preview()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Section>
  );
}
