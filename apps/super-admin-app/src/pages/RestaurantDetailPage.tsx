import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Boxes, IndianRupee, Pencil, Power, ReceiptText, RefreshCw, Trash2, UserRound, Users } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  Skeleton,
  useConfirm,
} from '@feedo/ui';
import { formatCurrency, formatDate, formatRelativeTime } from '@feedo/utils';
import type { Order, SubscriptionPlan, SubscriptionStatus } from '@feedo/types';
import {
  useDeleteRestaurant,
  useRenewSubscription,
  useRestaurantDetail,
  useToggleLive,
  useUpdateSubscription,
} from '../lib/api.js';
import { OrderDetailsDialog } from '../components/OrderDetailsDialog.js';

const PLANS: SubscriptionPlan[] = ['trial', 'starter', 'growth', 'enterprise'];
const STATUSES: SubscriptionStatus[] = ['active', 'past_due', 'cancelled', 'trialing'];
const CYCLES = ['monthly', 'quarterly', 'yearly'] as const;
type Cycle = (typeof CYCLES)[number];

const STATUS_VARIANT: Record<string, 'default' | 'accent' | 'success' | 'warning' | 'destructive'> = {
  pending: 'warning',
  confirmed: 'accent',
  preparing: 'warning',
  ready: 'success',
  served: 'default',
  completed: 'success',
  cancelled: 'destructive',
  refunded: 'destructive',
};

export function RestaurantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useRestaurantDetail(id);
  const toggleLive = useToggleLive();
  const removeRestaurant = useDeleteRestaurant();
  const confirm = useConfirm();
  const [selected, setSelected] = useState<Order | null>(null);

  const suspend = async () => {
    if (!data) return;
    const live = data.restaurant.isLive;
    const ok = await confirm({
      title: live ? `Suspend ${data.restaurant.name}?` : `Reactivate ${data.restaurant.name}?`,
      description: live
        ? 'Their customer ordering goes offline immediately.'
        : 'Their storefront goes live again.',
      confirmText: live ? 'Suspend' : 'Reactivate',
      destructive: live,
    });
    if (ok && id) toggleLive.mutate({ id, isLive: !live });
  };

  const remove = async () => {
    if (!data || !id) return;
    const ok = await confirm({
      title: `Delete ${data.restaurant.name}?`,
      description: 'Permanently removes the restaurant, staff, menu and orders. Cannot be undone.',
      confirmText: 'Delete forever',
      destructive: true,
    });
    if (ok) removeRestaurant.mutate(id, { onSuccess: () => navigate('/restaurants') });
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const r = data.restaurant;

  return (
    <div className="space-y-6">
      <Link to="/restaurants" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All restaurants
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-lg font-semibold">
            {r.name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{r.name}</h1>
            <p className="text-sm text-muted-foreground">
              /{r.slug}
              {r.contactNumber ? ` · 📞 ${String(r.contactNumber)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {data.subscription?.plan ?? 'no plan'}
          </Badge>
          <Badge variant={r.isLive ? 'success' : 'warning'}>{r.isLive ? 'Live' : 'Offline'}</Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue" value={formatCurrency(data.revenue)} icon={IndianRupee} />
        <Stat label="Paid orders" value={String(data.paidOrders)} icon={ReceiptText} />
        <Stat label="Products" value={String(data.productCount)} icon={Boxes} />
        <Stat label="Customers" value={String(data.customerCount)} icon={UserRound} />
      </div>

      {/* Subscription & access management */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SubscriptionCard restaurantId={id!} subscription={data.subscription} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Storefront</p>
                <p className="text-xs text-muted-foreground">
                  {r.isLive ? 'Live — diners can order.' : 'Offline — the customer menu shows “not found”.'}
                </p>
              </div>
              <Button variant={r.isLive ? 'outline' : 'default'} onClick={suspend} disabled={toggleLive.isPending}>
                <Power className="h-4 w-4" /> {r.isLive ? 'Suspend' : 'Reactivate'}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <div>
                <p className="text-sm font-medium">Danger zone</p>
                <p className="text-xs text-muted-foreground">Permanently delete this restaurant.</p>
              </div>
              <Button
                variant="outline"
                onClick={remove}
                disabled={removeRestaurant.isPending}
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentOrders.length > 0 ? (
              <div className="divide-y divide-border">
                {data.recentOrders.map((o) => (
                  <button
                    key={o._id}
                    onClick={() => setSelected(o)}
                    className="flex w-full items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-secondary/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">#{o.orderNumber}</span>
                        <Badge variant={STATUS_VARIANT[o.status]} className="capitalize">
                          {o.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(o.placedAt)}</p>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(o.total)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="p-6 text-center text-sm text-muted-foreground">No orders yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Staff
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.staff.length > 0 ? (
              <div className="divide-y divide-border">
                {data.staff.map((s) => (
                  <div key={s._id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {s.role}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-6 text-center text-sm text-muted-foreground">No staff.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <OrderDetailsDialog
        order={selected}
        restaurantName={r.name}
        open={Boolean(selected)}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function SubscriptionCard({
  restaurantId,
  subscription,
}: {
  restaurantId: string;
  subscription: import('@feedo/api').RestaurantDetail['subscription'];
}) {
  const [editing, setEditing] = useState(false);
  const [renewing, setRenewing] = useState(false);

  const currentEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  const isExpired = currentEnd ? currentEnd.getTime() < Date.now() : false;
  const isExpiringSoon = Boolean(
    currentEnd && !isExpired && currentEnd.getTime() - Date.now() < 7 * 86400000,
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Subscription</CardTitle>
          {isExpired ? (
            <Badge variant="destructive" className="flex items-center gap-1 text-[10px] px-1.5 py-0">
              <AlertTriangle className="h-3 w-3" /> Expired
            </Badge>
          ) : isExpiringSoon ? (
            <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0">
              Expiring soon
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isExpired ? 'default' : 'outline'}
            className={isExpired ? 'bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5' : 'gap-1.5'}
            onClick={() => setRenewing(true)}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Renew
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <SubRow label="Plan">
            <span className="font-medium capitalize">{subscription?.plan ?? '—'}</span>
          </SubRow>
          <SubRow label="Status">
            <span className="font-medium capitalize">{(subscription?.status ?? '—').replace('_', ' ')}</span>
          </SubRow>
          <SubRow label="Price">
            <span className="font-medium">
              {subscription?.price ? `${formatCurrency(subscription.price)} / ${subscription.billingCycle}` : '—'}
            </span>
          </SubRow>
          <SubRow label="Expires">
            <span
              className={
                isExpired
                  ? 'font-bold text-destructive'
                  : isExpiringSoon
                  ? 'font-medium text-amber-600 dark:text-amber-400'
                  : 'font-medium'
              }
            >
              {currentEnd ? `${formatDate(currentEnd.toISOString())} ${isExpired ? '(Expired)' : ''}` : '—'}
            </span>
          </SubRow>
        </div>
      </CardContent>
      <SubscriptionDialog
        restaurantId={restaurantId}
        subscription={subscription}
        open={editing}
        onClose={() => setEditing(false)}
      />
      <RenewSubscriptionDialog
        restaurantId={restaurantId}
        subscription={subscription}
        open={renewing}
        onClose={() => setRenewing(false)}
      />
    </Card>
  );
}

function SubRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function RenewSubscriptionDialog({
  restaurantId,
  subscription,
  open,
  onClose,
}: {
  restaurantId: string;
  subscription: import('@feedo/api').RestaurantDetail['subscription'];
  open: boolean;
  onClose: () => void;
}) {
  const renew = useRenewSubscription();
  const currentEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  const isExpired = currentEnd ? currentEnd.getTime() < Date.now() : true;

  const [cycle, setCycle] = useState<Cycle>((subscription?.billingCycle as Cycle) ?? 'monthly');
  const [price, setPrice] = useState(String(subscription?.price ?? 0));
  const [mode, setMode] = useState<'cycle' | 'custom'>('cycle');
  const [customDays, setCustomDays] = useState('30');

  const computedExpiry = useMemo(() => {
    const base = currentEnd && currentEnd.getTime() > Date.now() ? currentEnd.getTime() : Date.now();
    const days =
      mode === 'custom'
        ? Number(customDays) || 30
        : cycle === 'yearly'
        ? 365
        : cycle === 'quarterly'
        ? 90
        : 30;
    return new Date(base + days * 86400000);
  }, [currentEnd, mode, customDays, cycle]);

  const handleRenew = (e: React.FormEvent) => {
    e.preventDefault();
    renew.mutate(
      {
        id: restaurantId,
        body: {
          cycle,
          price: Number(price),
          durationDays: mode === 'custom' ? Number(customDays) : undefined,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-emerald-500" /> Renew Subscription
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleRenew} className="space-y-4">
          <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current Plan:</span>
              <span className="font-semibold capitalize text-foreground">{subscription?.plan ?? 'starter'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current Expiry:</span>
              <span className={isExpired ? 'font-semibold text-destructive' : 'font-medium text-foreground'}>
                {currentEnd ? formatDate(currentEnd.toISOString()) : 'Not active'}{' '}
                {isExpired && currentEnd ? '(Expired)' : ''}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-1.5 font-medium">
              <span className="text-emerald-600 dark:text-emerald-400">New Expiry After Renewal:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatDate(computedExpiry.toISOString())}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Renewal Period</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('cycle');
                  setCycle('monthly');
                }}
                className={`rounded-lg border p-2.5 text-center text-xs font-medium transition-all ${
                  mode === 'cycle' && cycle === 'monthly'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500'
                    : 'border-border bg-card hover:bg-secondary/50 text-foreground'
                }`}
              >
                <span className="block font-semibold text-sm">+1 Month</span>
                <span className="text-[11px] text-muted-foreground">Monthly</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('cycle');
                  setCycle('quarterly');
                }}
                className={`rounded-lg border p-2.5 text-center text-xs font-medium transition-all ${
                  mode === 'cycle' && cycle === 'quarterly'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500'
                    : 'border-border bg-card hover:bg-secondary/50 text-foreground'
                }`}
              >
                <span className="block font-semibold text-sm">+3 Months</span>
                <span className="text-[11px] text-muted-foreground">Quarterly</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('cycle');
                  setCycle('yearly');
                }}
                className={`rounded-lg border p-2.5 text-center text-xs font-medium transition-all ${
                  mode === 'cycle' && cycle === 'yearly'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500'
                    : 'border-border bg-card hover:bg-secondary/50 text-foreground'
                }`}
              >
                <span className="block font-semibold text-sm">+1 Year</span>
                <span className="text-[11px] text-muted-foreground">Annual</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Custom Days (Optional)</Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 30, 60, 180"
                value={mode === 'custom' ? customDays : ''}
                onChange={(e) => {
                  setMode('custom');
                  setCustomDays(e.target.value);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fee (₹)</Label>
              <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>

          {renew.isError && (
            <p className="text-sm text-destructive">
              {renew.error instanceof Error ? renew.error.message : 'Could not renew subscription'}
            </p>
          )}

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={renew.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              <RefreshCw className={`h-4 w-4 ${renew.isPending ? 'animate-spin' : ''}`} />
              {renew.isPending ? 'Renewing…' : `Confirm Renewal`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionDialog({
  restaurantId,
  subscription,
  open,
  onClose,
}: {
  restaurantId: string;
  subscription: import('@feedo/api').RestaurantDetail['subscription'];
  open: boolean;
  onClose: () => void;
}) {
  const update = useUpdateSubscription();
  const [plan, setPlan] = useState<SubscriptionPlan>((subscription?.plan as SubscriptionPlan) ?? 'starter');
  const [status, setStatus] = useState<SubscriptionStatus>((subscription?.status as SubscriptionStatus) ?? 'active');
  const [price, setPrice] = useState(String(subscription?.price ?? 0));
  const [cycle, setCycle] = useState<Cycle>((subscription?.billingCycle as Cycle) ?? 'monthly');
  const [durationDays, setDurationDays] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(
      {
        id: restaurantId,
        body: {
          plan,
          status,
          price: Number(price),
          billingCycle: cycle,
          durationDays: durationDays ? Number(durationDays) : undefined,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit subscription</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={plan} onChange={(e) => setPlan(e.target.value as SubscriptionPlan)}>
                {PLANS.map((p) => (
                  <option key={p} value={p} className="capitalize">
                    {p}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Price (₹)</Label>
              <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Billing cycle</Label>
              <Select value={cycle} onChange={(e) => setCycle(e.target.value as Cycle)}>
                {CYCLES.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Duration override (days, optional)</Label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setDurationDays('30');
                    setStatus('active');
                  }}
                  className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground hover:bg-secondary/80"
                >
                  +30d
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDurationDays('90');
                    setStatus('active');
                  }}
                  className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground hover:bg-secondary/80"
                >
                  +90d
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDurationDays('365');
                    setStatus('active');
                  }}
                  className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground hover:bg-secondary/80"
                >
                  +1yr
                </button>
              </div>
            </div>
            <Input
              type="number"
              min="1"
              placeholder="Leave blank to derive expiry from the billing cycle"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
            />
            {subscription?.currentPeriodEnd && (
              <p className="text-xs text-muted-foreground">Current expiry: {formatDate(subscription.currentPeriodEnd)}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save subscription'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
