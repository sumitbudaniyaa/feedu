import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Gift, LogOut, Phone, ReceiptText, Sparkles, User } from 'lucide-react';
import { Badge, Button, Card, Skeleton } from '@feedo/ui';
import { formatCurrency, formatRelativeTime } from '@feedo/utils';
import { useAccount, useAuth } from '../lib/api.js';
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

export function AccountPage() {
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
    navigate('/', { replace: true });
    return null;
  }

  const name = data?.customer?.name || guest.name || 'Guest';

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-16">
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-background/85 px-5 py-4 backdrop-blur">
        <motion.button whileTap={{ scale: 0.9 }} onClick={goBack} className="rounded-lg p-1 hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </motion.button>
        <h1 className="text-lg font-semibold tracking-tight">Account</h1>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/rewards')}
          aria-label="Rewards"
          className="ml-auto flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/70"
        >
          <Gift className="h-3.5 w-3.5" /> Rewards
        </motion.button>
      </header>

      <main className="space-y-6 px-5 pt-2">
        {!isAuthed ? (
          <OtpLogin />
        ) : isLoading || !data ? (
          <div className="space-y-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : (
          <>
            {/* Account details */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <User className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold">{name}</p>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> {phone || '—'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-accent" /> Reward points
                  </span>
                  <span className="text-lg font-bold tabular-nums">{data.customer?.points ?? 0}</span>
                </div>
              </Card>
            </motion.div>

            {/* Order history */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <ReceiptText className="h-4 w-4" /> Order history
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

            {/* Log out */}
            <Button
              variant="outline"
              className="w-full gap-2 rounded-xl border-destructive/30 bg-destructive/5 font-semibold text-destructive hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" /> Log out
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
