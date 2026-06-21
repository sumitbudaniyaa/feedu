import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { fadeUp, inView, stagger } from '../lib/anim.js';

/** Tailwind class concat helper (no external dep). */
export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/** Page section wrapper — generous editorial rhythm. */
export function Section({
  id,
  children,
  className,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cx('relative mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 md:py-32', className)}>
      {children}
    </section>
  );
}

/** Pill eyebrow label (trupeer-style) — butter-yellow chip. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="btn-yellow inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em]">
      {children}
    </span>
  );
}

/** Animated section heading — serif display, calm. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'left';
}) {
  return (
    <motion.div
      variants={stagger}
      {...inView}
      className={cx('flex max-w-2xl flex-col gap-5', align === 'center' ? 'mx-auto items-center text-center' : 'items-start text-left')}
    >
      {eyebrow && (
        <motion.div variants={fadeUp}>
          <Eyebrow>{eyebrow}</Eyebrow>
        </motion.div>
      )}
      <motion.h2
        variants={fadeUp}
        className="font-display text-balance text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl"
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p variants={fadeUp} className="text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
          {description}
        </motion.p>
      )}
    </motion.div>
  );
}

/** Primary button — solid ink, cream label. */
export function ButtonPrimary({
  children,
  href = '#',
  className,
}: {
  children: ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <motion.a
      href={href}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={cx(
        'btn-yellow group relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-[.65rem] px-5 py-3 text-sm font-semibold shadow-[0_8px_22px_-14px_rgba(120,90,20,0.7)]',
        className,
      )}
    >
      {/* hover ripple — color fills slowly + smoothly from the middle outward */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 h-0 w-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--butter-deep)] transition-[width,height] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:h-[520px] group-hover:w-[520px]"
      />
      {children}
    </motion.a>
  );
}

/** Secondary button — hairline outline on paper. */
export function ButtonSecondary({
  children,
  href = '#',
  className,
}: {
  children: ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <motion.a
      href={href}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-foreground/25',
        className,
      )}
    >
      {children}
    </motion.a>
  );
}

/** Soft warm wash — subtle paper glow, positioned by the caller. */
export function Glow({ className }: { className?: string; color?: string }) {
  return (
    <div
      aria-hidden
      className={cx('pointer-events-none absolute -z-10 rounded-full blur-[110px]', className)}
      style={{ background: 'radial-gradient(circle, hsl(20 86% 50% / 0.12), transparent 70%)' }}
    />
  );
}
