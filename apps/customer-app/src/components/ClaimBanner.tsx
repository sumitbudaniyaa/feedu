import { motion } from 'framer-motion';
import { ChevronRight, Gift } from 'lucide-react';

/** Animated banner nudging the diner that they can claim a free reward. */
export function ClaimBanner({ count, onClick }: { count: number; onClick: () => void }) {
  if (count <= 0) return null;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      className="relative w-full overflow-hidden rounded-2xl border border-accent/30 p-4 text-left"
      style={{ background: 'linear-gradient(135deg, hsl(var(--accent) / 0.12), hsl(var(--accent) / 0.04))' }}
    >
      {/* sweeping sheen */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-12"
        style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--accent) / 0.18), transparent)' }}
        animate={{ x: ['0%', '450%'] }}
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }}
      />
      <div className="relative flex items-center gap-3">
        <motion.div
          animate={{ scale: [1, 1.12, 1], rotate: [0, -6, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
        >
          <Gift className="h-5 w-5" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {count === 1 ? 'A free reward is ready 🎉' : `${count} free rewards ready 🎉`}
          </p>
          <p className="text-xs text-muted-foreground">Tap to add it to your order — on us.</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-accent" />
      </div>
    </motion.button>
  );
}
