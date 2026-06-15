import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Boxes, IndianRupee, Pencil, Power, ReceiptText, Trash2, UserRound, Users } from 'lucide-react';
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

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Subscription</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
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
            <span className="font-medium">
              {subscription?.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : '—'}
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(
      { id: restaurantId, body: { plan, status, price: Number(price), billingCycle: cycle } },
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
          <p className="text-xs text-muted-foreground">Expiry is set automatically from the billing cycle.</p>
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
