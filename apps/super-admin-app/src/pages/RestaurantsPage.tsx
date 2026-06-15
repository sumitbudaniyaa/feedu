import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Plus, Power, SlidersHorizontal, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  Skeleton,
  useConfirm,
} from '@feedo/ui';
import { formatCurrency, formatDate } from '@feedo/utils';
import type { SubscriptionPlan, SubscriptionStatus } from '@feedo/types';
import type { PlatformRestaurant } from '@feedo/api';
import {
  useDeleteRestaurant,
  useOnboardRestaurant,
  useRestaurants,
  useToggleLive,
  useUpdateSubscription,
} from '../lib/api.js';

const PLANS: SubscriptionPlan[] = ['trial', 'starter', 'growth', 'enterprise'];
const STATUSES: SubscriptionStatus[] = ['active', 'past_due', 'cancelled', 'trialing'];
const CYCLES = ['monthly', 'quarterly', 'yearly'] as const;
type Cycle = (typeof CYCLES)[number];

export function RestaurantsPage() {
  const { data, isLoading } = useRestaurants();
  const toggleLive = useToggleLive();
  const removeRestaurant = useDeleteRestaurant();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<PlatformRestaurant | null>(null);
  const [onboarding, setOnboarding] = useState(false);

  const toggle = async (r: PlatformRestaurant) => {
    const ok = await confirm({
      title: r.isLive ? `Suspend ${r.name}?` : `Reactivate ${r.name}?`,
      description: r.isLive
        ? 'Their customer ordering will go offline immediately.'
        : 'Their restaurant will go live again.',
      confirmText: r.isLive ? 'Suspend' : 'Reactivate',
      destructive: r.isLive,
    });
    if (ok) toggleLive.mutate({ id: r._id, isLive: !r.isLive });
  };

  const remove = async (r: PlatformRestaurant) => {
    const ok = await confirm({
      title: `Delete ${r.name}?`,
      description: 'This permanently removes the restaurant, its staff, menu and orders. This cannot be undone.',
      confirmText: 'Delete forever',
      destructive: true,
    });
    if (ok) removeRestaurant.mutate(r._id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Restaurants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every restaurant on the platform — onboard, manage plans and access.
          </p>
        </div>
        <Button onClick={() => setOnboarding(true)}>
          <Plus className="h-4 w-4" /> Onboard restaurant
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <Card className="divide-y divide-border">
          {data.map((r) => (
            <div key={r._id} className="flex items-center gap-4 p-4">
              <Link to={`/restaurants/${r._id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-sm font-medium">
                  {r.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.orderCount} orders · joined {formatDate(r.createdAt)}
                    {r.subscription?.currentPeriodEnd
                      ? ` · expires ${formatDate(r.subscription.currentPeriodEnd)}`
                      : ''}
                  </p>
                </div>
              </Link>
              <span className="hidden text-sm font-medium sm:block">
                {formatCurrency(r.subscription?.price ?? 0)}/{(r.subscription?.billingCycle ?? 'monthly')[0]}
              </span>
              <Badge variant="outline" className="capitalize">
                {r.subscription?.plan ?? 'none'}
              </Badge>
              <Badge variant={r.isLive ? 'success' : 'warning'}>{r.isLive ? 'Live' : 'Offline'}</Badge>
              <Button size="icon" variant="ghost" title="Edit plan" onClick={() => setEditing(r)}>
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title={r.isLive ? 'Suspend' : 'Reactivate'}
                onClick={() => toggle(r)}
              >
                <Power className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" title="Delete" onClick={() => remove(r)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
              <Link to={`/restaurants/${r._id}`} className="text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </Card>
      ) : (
        <EmptyState icon={Building2} title="No restaurants yet" />
      )}

      <SubscriptionDialog restaurant={editing} onClose={() => setEditing(null)} />
      <OnboardDialog open={onboarding} onClose={() => setOnboarding(false)} />
    </div>
  );
}

function SubscriptionDialog({
  restaurant,
  onClose,
}: {
  restaurant: PlatformRestaurant | null;
  onClose: () => void;
}) {
  const update = useUpdateSubscription();
  const [plan, setPlan] = useState<SubscriptionPlan>('trial');
  const [status, setStatus] = useState<SubscriptionStatus>('trialing');
  const [price, setPrice] = useState('0');
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [expiry, setExpiry] = useState('');

  // Sync local form when a new restaurant is opened.
  const key = restaurant?._id ?? '';
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    const s = restaurant?.subscription;
    setPlan((s?.plan as SubscriptionPlan) ?? 'trial');
    setStatus((s?.status as SubscriptionStatus) ?? 'trialing');
    setPrice(String(s?.price ?? 0));
    setCycle((s?.billingCycle as Cycle) ?? 'monthly');
    setExpiry(s?.currentPeriodEnd ? new Date(s.currentPeriodEnd).toISOString().slice(0, 10) : '');
  }

  return (
    <Dialog open={Boolean(restaurant)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{restaurant?.name} · subscription</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!restaurant) return;
            update.mutate(
              {
                id: restaurant._id,
                body: {
                  plan,
                  status,
                  price: Number(price),
                  billingCycle: cycle,
                  currentPeriodEnd: expiry ? new Date(expiry).toISOString() : undefined,
                },
              },
              { onSuccess: onClose },
            );
          }}
        >
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
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <Label>Expires on</Label>
            <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OnboardDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const onboard = useOnboardRestaurant();
  const [form, setForm] = useState({
    restaurantName: '',
    ownerName: '',
    email: '',
    password: '',
    price: '0',
    billingCycle: 'monthly' as Cycle,
    durationDays: '30',
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onboard.mutate(
      {
        restaurantName: form.restaurantName,
        ownerName: form.ownerName,
        email: form.email,
        password: form.password,
        price: Number(form.price),
        billingCycle: form.billingCycle,
        durationDays: Number(form.durationDays),
      },
      {
        onSuccess: () => {
          onClose();
          setForm({ restaurantName: '', ownerName: '', email: '', password: '', price: '0', billingCycle: 'monthly', durationDays: '30' });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Onboard a restaurant</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label>Restaurant name</Label>
            <Input value={form.restaurantName} onChange={(e) => set('restaurantName', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Owner name</Label>
              <Input value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Owner email</Label>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Temporary password</Label>
            <Input type="text" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={6} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Price (₹)</Label>
              <Input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cycle</Label>
              <Select value={form.billingCycle} onChange={(e) => set('billingCycle', e.target.value)}>
                {CYCLES.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Days</Label>
              <Input type="number" min="1" value={form.durationDays} onChange={(e) => set('durationDays', e.target.value)} />
            </div>
          </div>
          {onboard.isError && (
            <p className="text-sm text-destructive">
              {onboard.error instanceof Error ? onboard.error.message : 'Could not onboard restaurant'}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={onboard.isPending}>
              {onboard.isPending ? 'Creating…' : 'Create restaurant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
