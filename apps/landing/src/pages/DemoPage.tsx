import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Building2, ChefHat, ConciergeBell, Pause, Play, QrCode, Smartphone } from 'lucide-react';
import { ButtonPrimary, cx } from '../components/primitives.js';
import { DashboardMockup, KdsMockup, PhoneMockup, WaiterPanel } from '../components/mockups.js';
import { EASE } from '../lib/anim.js';

const STEP_MS = 4200;

type Step = {
  key: string;
  label: string;
  icon: typeof QrCode;
  title: string;
  desc: string;
  points: string[];
  render: () => JSX.Element;
};

const STEPS: Step[] = [
  {
    key: 'scan',
    label: 'Scan',
    icon: QrCode,
    title: 'The diner scans the QR at their table',
    desc: 'No app install. The QR opens the menu and locks the order to the right table.',
    points: ['Per-table QR codes', 'Auto-detects the table', 'Works on any phone'],
    render: () => <ScanStage />,
  },
  {
    key: 'order',
    label: 'Order',
    icon: Smartphone,
    title: 'They browse, customise and pay',
    desc: 'A fast, dark, Zomato-style PWA — search, veg filter, rewards and Razorpay or cash.',
    points: ['Veg mode + search', 'Add to cart & customise', 'Pay online or at counter', 'Earn & redeem rewards'],
    render: () => <PhoneMockup />,
  },
  {
    key: 'kitchen',
    label: 'Kitchen',
    icon: ChefHat,
    title: 'The kitchen gets it instantly',
    desc: 'Orders hit the KDS the moment they’re placed — colour-coded by status with live timers.',
    points: ['New → Preparing → Ready', 'Per-category filter', 'Prep timers', 'Veg / non-veg markers'],
    render: () => <KdsMockup />,
  },
  {
    key: 'waiter',
    label: 'Waiter',
    icon: ConciergeBell,
    title: 'The floor stays in sync',
    desc: 'Diners ring the table for help or the bill; staff are notified and acknowledge in a tap.',
    points: ['Live table calls', 'Assistance & bill requests', 'Clears across every device'],
    render: () => <WaiterPanel />,
  },
  {
    key: 'owner',
    label: 'Owner',
    icon: Building2,
    title: 'The owner sees everything update live',
    desc: 'Revenue, orders, seat occupancy and reservations refresh in real time across branches.',
    points: ['Live revenue & orders', 'Seat-occupancy grid', 'Reservations', 'Multi-branch analytics'],
    render: () => <DashboardMockup />,
  },
];

export function DemoPage() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const step = STEPS[active]!;

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setActive((i) => (i + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(id);
  }, [active, playing]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2">
          <img src="/feedu-mark-light.png" alt="" className="h-7 w-7 object-contain" />
          <span className="text-2xl font-black italic tracking-tight">feedu</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <ButtonPrimary href="/contact-sales" className="!px-5 !py-2.5">Contact sales</ButtonPrimary>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24 pt-6 sm:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Interactive demo
          </span>
          <h1 className="font-display mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            See an order flow through <span className="text-accent">every app.</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            One scan ripples through the customer, kitchen, waiter and owner apps — live. Watch it play, or click a step.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          {/* Steps rail */}
          <div className="flex flex-col gap-2.5">
            {STEPS.map((s, i) => {
              const selected = i === active;
              return (
                <button
                  key={s.key}
                  onClick={() => setActive(i)}
                  className={cx(
                    'group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300',
                    selected ? 'border-accent/40 bg-card shadow-sm' : 'border-border bg-transparent hover:bg-card/60',
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors', selected ? 'bg-accent text-accent-foreground' : 'bg-secondary text-foreground/70')}>
                      <s.icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          0{i + 1}
                        </span>
                        <span className="font-display text-base font-semibold">{s.label}</span>
                      </div>
                      <p className={cx('mt-0.5 text-sm leading-snug', selected ? 'text-foreground/80' : 'text-muted-foreground')}>
                        {s.title}
                      </p>
                    </div>
                  </div>
                  {/* progress bar fills while this step is active */}
                  {selected && playing && (
                    <motion.span
                      key={`p-${active}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: STEP_MS / 1000, ease: 'linear' }}
                      style={{ originX: 0 }}
                      className="absolute bottom-0 left-0 h-0.5 w-full bg-accent"
                    />
                  )}
                </button>
              );
            })}

            <button
              onClick={() => setPlaying((p) => !p)}
              className="mt-1 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {playing ? 'Pause' : 'Play'}
            </button>
          </div>

          {/* Stage viewport */}
          <div className="relative flex min-h-[520px] flex-col rounded-3xl border border-border bg-dots p-6 sm:p-8">
            <div className="flex flex-1 items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -18, filter: 'blur(6px)' }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="w-full max-w-md"
                >
                  {step.render()}
                </motion.div>
              </AnimatePresence>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`cap-${step.key}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="mt-6 rounded-2xl border border-border bg-card/80 p-4 backdrop-blur"
              >
                <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {step.points.map((p) => (
                    <span key={p} className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium">
                      {p}
                    </span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 text-center">
          <p className="font-display text-2xl font-semibold">Want this running in your restaurant?</p>
          <ButtonPrimary href="/contact-sales">Contact sales</ButtonPrimary>
        </div>
      </main>
    </div>
  );
}

/** Animated "scan the QR" stage — a phone camera framing a table QR. */
function ScanStage() {
  return (
    <div className="relative mx-auto w-[252px] overflow-hidden rounded-[2.3rem] border border-black/10 bg-[#0d0d0d] text-white shadow-2xl">
      <div className="flex justify-center pt-2">
        <div className="h-1.5 w-16 rounded-full bg-white/15" />
      </div>
      <div className="px-4 pb-5 pt-4">
        <p className="text-center text-xs font-medium text-white/70">Point at the QR on your table</p>
        {/* camera viewfinder */}
        <div className="relative mt-3 aspect-square overflow-hidden rounded-2xl bg-[#161616]">
          {/* corner brackets */}
          {[
            'left-3 top-3 border-l-2 border-t-2',
            'right-3 top-3 border-r-2 border-t-2',
            'left-3 bottom-3 border-l-2 border-b-2',
            'right-3 bottom-3 border-r-2 border-b-2',
          ].map((c) => (
            <span key={c} className={cx('absolute h-6 w-6 rounded-[3px] border-app-green', c)} />
          ))}
          {/* QR */}
          <div className="absolute inset-0 flex items-center justify-center">
            <QrCode className="h-28 w-28 text-white/90" strokeWidth={1.2} />
          </div>
          {/* scan line */}
          <motion.span
            initial={{ y: '-40%' }}
            animate={{ y: '40%' }}
            transition={{ duration: 1.6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            className="absolute inset-x-6 top-1/2 h-0.5 rounded-full bg-app-green shadow-[0_0_12px_2px_rgba(16,185,129,0.7)]"
          />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-app-green/15 py-2 text-xs font-semibold text-app-green"
        >
          ✓ Table 7 · Spicebox detected
        </motion.div>
      </div>
    </div>
  );
}
