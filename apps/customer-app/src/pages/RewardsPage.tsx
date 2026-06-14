import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Gift, Sparkles, User } from 'lucide-react';
import { Badge, Button, Card, Skeleton, cn } from '@feedo/ui';
import { formatRelativeTime } from '@feedo/utils';
import type { LoyaltyReward, Redemption } from '@feedo/types';
import { useAccount, useAuth } from '../lib/api.js';
import { useCart } from '../store/cart.js';
import { useGuest } from '../store/guest.js';
import { OtpLogin } from '../components/OtpLogin.js';

export function RewardsPage() {
  const navigate = useNavigate();
  const { restaurant, menuPath } = useCart();
  const guest = useGuest();
  const isAuthed = useAuth((s) => Boolean(s.tokens?.accessToken));

  const phone = guest.phone;
  const { data, isLoading } = useAccount(restaurant?.slug, isAuthed);

  const goBack = () => navigate(menuPath ?? '/');

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
        <h1 className="text-lg font-semibold tracking-tight">Rewards</h1>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/account')}
          aria-label="Account"
          className="ml-auto flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/70"
        >
          <User className="h-3.5 w-3.5" /> Account
        </motion.button>
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
                </div>
              </div>
            </motion.div>

            {/* Rewards catalog with eligibility */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Gift className="h-4 w-4" /> Claim with points
              </h2>
              {data.rewards.filter((r) => r.productId).length > 0 ? (
                <div className="space-y-3">
                  {data.rewards
                    .filter((r) => r.productId)
                    .map((reward, i) => (
                      <RewardCard
                        key={reward._id}
                        reward={reward}
                        points={data.customer?.points ?? 0}
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
          </>
        )}
      </main>
    </div>
  );
}

function RewardCard({ reward, points, index }: { reward: LoyaltyReward; points: number; index: number }) {
  const navigate = useNavigate();
  const setReward = useCart((s) => s.setReward);

  const eligible = points >= reward.pointsCost;
  const progress = Math.min(100, Math.round((points / reward.pointsCost) * 100));

  // Add the reward to the cart as a free item and head to checkout.
  const addToOrder = () => {
    setReward({ rewardId: reward._id, title: reward.title, pointsCost: reward.pointsCost });
    navigate('/cart');
  };

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
                {eligible ? 'Free with your order' : `${reward.pointsCost - points} more points to go`}
              </p>
              <Button size="sm" disabled={!eligible} onClick={addToOrder}>
                Add to order
              </Button>
            </div>
          </div>
        </div>
      </Card>
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
