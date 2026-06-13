import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Gift, PartyPopper, ReceiptText, Sparkles } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Skeleton,
  cn,
} from '@feedo/ui';
import { formatCurrency, formatRelativeTime } from '@feedo/utils';
import type { LoyaltyReward, Redemption } from '@feedo/types';
import { useAccount, useAuth, useRedeem } from '../lib/api.js';
import { useCart } from '../store/cart.js';
import { useGuest } from '../store/guest.js';
import { OtpLogin } from '../components/OtpLogin.js';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'default' | 'accent'> = {
  pending: 'warning',
  confirmed: 'accent',
  preparing: 'warning',
  ready: 'success',
  served: 'default',
  completed: 'success',
  cancelled: 'destructive',
  refunded: 'destructive',
};

export function RewardsPage() {
  const navigate = useNavigate();
  const { restaurant, menuPath } = useCart();
  const guest = useGuest();
  const isAuthed = useAuth((s) => Boolean(s.tokens?.accessToken));
  const clearTokens = useAuth((s) => s.clear);

  const phone = guest.phone;
  const { data, isLoading } = useAccount(restaurant?.slug, isAuthed);

  const goBack = () => navigate(menuPath ?? '/');
  const signOut = () => {
    clearTokens();
    guest.clear();
  };

  if (!restaurant) {
    // No restaurant context — send them to scan/enter first.
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-16">
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-background/85 px-5 py-4 backdrop-blur">
        <motion.button whileTap={{ scale: 0.9 }} onClick={goBack} className="rounded-lg p-1 hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </motion.button>
        <h1 className="text-lg font-semibold tracking-tight">Rewards & orders</h1>
      </header>

      <main className="space-y-6 px-5 pt-2">
        {!isAuthed ? (
          <OtpLogin />
        ) : isLoading || !data ? (
          <div className="space-y-4">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : (
          <>
            {/* Wallet */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-2xl p-5 text-white"
              style={{
                background:
                  'linear-gradient(150deg, hsl(var(--accent)), hsl(var(--accent) / 0.75) 65%, hsl(var(--accent) / 0.55))',
              }}
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
              <p className="text-xs font-medium uppercase tracking-widest text-white/80">
                {restaurant.name} · Rewards wallet
              </p>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <motion.p
                    key={data.customer?.points ?? 0}
                    initial={{ scale: 1.15, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-4xl font-bold tabular-nums tracking-tight"
                  >
                    {data.customer?.points ?? 0}
                  </motion.p>
                  <p className="text-sm text-white/85">points</p>
                </div>
                <div className="text-right text-xs text-white/80">
                  <p>{data.customer?.name || guest.name || 'Guest'}</p>
                  <p>{phone}</p>
                  <button onClick={signOut} className="mt-1 underline underline-offset-2">
                    Switch number
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Rewards catalog with eligibility */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Gift className="h-4 w-4" /> Claim with points
              </h2>
              {data.rewards.length > 0 ? (
                <div className="space-y-3">
                  {data.rewards.map((reward, i) => (
                    <RewardCard
                      key={reward._id}
                      reward={reward}
                      points={data.customer?.points ?? 0}
                      slug={restaurant.slug}
                      index={i}
                    />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed p-4 text-sm text-muted-foreground">
                  No rewards available right now — keep earning points with every order!
                </Card>
              )}
            </section>

            {/* Previous claims */}
            {data.redemptions.length > 0 && (
              <section className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-4 w-4" /> Your claims
                </h2>
                <Card className="divide-y divide-border">
                  {data.redemptions.map((r) => (
                    <ClaimRow key={r._id} redemption={r} />
                  ))}
                </Card>
              </section>
            )}

            {/* Past orders */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <ReceiptText className="h-4 w-4" /> Past orders
              </h2>
              {data.orders.length > 0 ? (
                <Card className="divide-y divide-border">
                  {data.orders.map((o) => (
                    <Link
                      key={o._id}
                      to={`/order/${o._id}`}
                      className="flex items-center gap-3 p-3.5 transition-colors hover:bg-secondary/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">#{o.orderNumber}</span>
                          <Badge variant={STATUS_VARIANT[o.status]} className="capitalize">
                            {o.status}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {o.items.length} item{o.items.length > 1 ? 's' : ''} ·{' '}
                          {formatRelativeTime(o.placedAt)}
                          {o.loyaltyPointsEarned > 0 ? ` · +${o.loyaltyPointsEarned} pts` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(o.total)}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </Card>
              ) : (
                <Card className="border-dashed p-4 text-sm text-muted-foreground">
                  No orders yet from {phone}. Your orders will appear here.
                </Card>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function RewardCard({
  reward,
  points,
  slug,
  index,
}: {
  reward: LoyaltyReward;
  points: number;
  slug: string;
  index: number;
}) {
  const navigate = useNavigate();
  const tableId = useCart((s) => s.tableId);
  const setReward = useCart((s) => s.setReward);
  const redeem = useRedeem(slug);
  const [confirming, setConfirming] = useState(false);
  const [claimed, setClaimed] = useState<Redemption | null>(null);

  const eligible = points >= reward.pointsCost;
  const progress = Math.min(100, Math.round((points / reward.pointsCost) * 100));
  const linked = Boolean(reward.productId);

  // Linked reward → add it to the cart and head to checkout (free item on the order).
  const addToOrder = () => {
    setReward({ rewardId: reward._id, title: reward.title, pointsCost: reward.pointsCost });
    navigate('/cart');
  };

  // Non-linked reward → fall back to a claim code.
  const claim = () =>
    redeem.mutate(
      { rewardId: reward._id, tableId: tableId ?? undefined },
      {
        onSuccess: ({ order, redemption }) => {
          setConfirming(false);
          if (order) navigate(`/order/${order._id}`);
          else setClaimed(redemption);
        },
      },
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.25) }}
    >
      <Card className={cn('p-4', eligible && 'border-accent/40')}>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
              eligible ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground',
            )}
          >
            <Gift className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-medium">{reward.title}</p>
              <Badge variant={eligible ? 'accent' : 'outline'}>{reward.pointsCost} pts</Badge>
            </div>
            {reward.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{reward.description}</p>
            )}

            {/* Progress towards eligibility */}
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                {eligible
                  ? 'You can claim this now'
                  : `${reward.pointsCost - points} more points to go`}
              </p>
              <Button
                size="sm"
                disabled={!eligible || redeem.isPending}
                onClick={linked ? addToOrder : () => setConfirming(true)}
              >
                {linked ? 'Add to order' : redeem.isPending ? 'Claiming…' : 'Claim'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Confirm + success dialog */}
      <Dialog
        open={confirming || Boolean(claimed)}
        onOpenChange={(v) => {
          if (!v) {
            setConfirming(false);
            setClaimed(null);
          }
        }}
      >
        <DialogContent className="max-w-xs">
          <AnimatePresence mode="wait">
            {claimed ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-2 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15"
                >
                  <PartyPopper className="h-6 w-6 text-accent" />
                </motion.div>
                <h3 className="mt-4 font-semibold">{claimed.rewardTitle} claimed!</h3>
                <p className="mt-1 text-sm text-muted-foreground">Show this code to the staff:</p>
                <p className="mt-3 rounded-xl border-2 border-dashed border-accent/50 bg-accent/5 px-6 py-3 font-mono text-2xl font-bold tracking-[0.3em] text-accent">
                  {claimed.code}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {claimed.pointsCost} points were deducted from your wallet.
                </p>
              </motion.div>
            ) : (
              <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <DialogHeader>
                  <DialogTitle>Claim {reward.title}?</DialogTitle>
                </DialogHeader>
                <p className="mt-2 text-sm text-muted-foreground">
                  {reward.pointsCost} points will be deducted and we&apos;ll send this to the
                  kitchen as a free order — no charge.
                </p>
                {redeem.error && (
                  <p className="mt-2 text-sm text-destructive">
                    {redeem.error instanceof Error ? redeem.error.message : 'Could not claim'}
                  </p>
                )}
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setConfirming(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" disabled={redeem.isPending} onClick={claim}>
                    {redeem.isPending ? 'Claiming…' : 'Confirm'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function ClaimRow({ redemption }: { redemption: Redemption }) {
  return (
    <div className="flex items-center gap-3 p-3.5">
      <code className="rounded-md bg-secondary px-2 py-1 font-mono text-sm font-bold tracking-widest">
        {redemption.code}
      </code>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{redemption.rewardTitle}</p>
        <p className="text-xs text-muted-foreground">
          {redemption.pointsCost} pts · {formatRelativeTime(redemption.createdAt)}
        </p>
      </div>
      <Badge
        variant={
          redemption.status === 'fulfilled'
            ? 'success'
            : redemption.status === 'cancelled'
              ? 'destructive'
              : 'warning'
        }
        className="capitalize"
      >
        {redemption.status}
      </Badge>
    </div>
  );
}
