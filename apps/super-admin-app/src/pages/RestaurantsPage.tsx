import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Power, SlidersHorizontal } from 'lucide-react';
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
import { useRestaurants, useToggleLive, useUpdateSubscription } from '../lib/api.js';

const PLANS: SubscriptionPlan[] = ['trial', 'starter', 'growth', 'enterprise'];
const STATUSES: SubscriptionStatus[] = ['active', 'past_due', 'cancelled', 'trialing'];

export function RestaurantsPage() {
  const { data, isLoading } = useRestaurants();
  const toggleLive = useToggleLive();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<PlatformRestaurant | null>(null);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Restaurants</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every restaurant on the platform — manage plans and access.</p>
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
                  </p>
                </div>
              </Link>
              <span className="hidden text-sm font-medium sm:block">
                {formatCurrency(r.subscription?.mrr ?? 0)}/mo
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
  const [mrr, setMrr] = useState('0');

  // Sync local form when a new restaurant is opened.
  const key = restaurant?._id ?? '';
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setPlan((restaurant?.subscription?.plan as SubscriptionPlan) ?? 'trial');
    setStatus((restaurant?.subscription?.status as SubscriptionStatus) ?? 'trialing');
    setMrr(String(restaurant?.subscription?.mrr ?? 0));
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
              { id: restaurant._id, body: { plan, status, mrr: Number(mrr) } },
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
          <div className="space-y-1.5">
            <Label>MRR (₹/month)</Label>
            <Input type="number" min="0" value={mrr} onChange={(e) => setMrr(e.target.value)} />
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
