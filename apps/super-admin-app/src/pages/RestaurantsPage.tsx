import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Plus } from 'lucide-react';
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
} from '@feedo/ui';
import { formatCurrency, formatDate } from '@feedo/utils';
import { useOnboardRestaurant, useRestaurants } from '../lib/api.js';

const CYCLES = ['monthly', 'quarterly', 'yearly'] as const;
type Cycle = (typeof CYCLES)[number];

export function RestaurantsPage() {
  const { data, isLoading } = useRestaurants();
  const [onboarding, setOnboarding] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Restaurants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Onboard restaurants. Open one to manage its plan, pricing and access.
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
            <Link key={r._id} to={`/restaurants/${r._id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-secondary/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-sm font-medium">
                {r.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.orderCount} orders · joined {formatDate(r.createdAt)}
                  {r.subscription?.currentPeriodEnd ? ` · expires ${formatDate(r.subscription.currentPeriodEnd)}` : ''}
                </p>
              </div>
              <span className="hidden text-sm font-medium sm:block">
                {formatCurrency(r.subscription?.price ?? 0)}/{(r.subscription?.billingCycle ?? 'monthly')[0]}
              </span>
              <Badge variant="outline" className="capitalize">
                {r.subscription?.plan ?? 'none'}
              </Badge>
              <Badge variant={r.isLive ? 'success' : 'warning'}>{r.isLive ? 'Live' : 'Offline'}</Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </Card>
      ) : (
        <EmptyState icon={Building2} title="No restaurants yet" />
      )}

      <OnboardDialog open={onboarding} onClose={() => setOnboarding(false)} />
    </div>
  );
}

function OnboardDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const onboard = useOnboardRestaurant();
  const [form, setForm] = useState({
    restaurantName: '',
    ownerName: '',
    email: '',
    contactNumber: '',
    password: '',
    price: '0',
    billingCycle: 'monthly' as Cycle,
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const reset = () =>
    setForm({ restaurantName: '', ownerName: '', email: '', contactNumber: '', password: '', price: '0', billingCycle: 'monthly' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onboard.mutate(
      {
        restaurantName: form.restaurantName,
        ownerName: form.ownerName,
        email: form.email,
        contactNumber: form.contactNumber || undefined,
        password: form.password,
        price: Number(form.price),
        billingCycle: form.billingCycle,
      },
      {
        onSuccess: () => {
          onClose();
          reset();
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Restaurant mobile</Label>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit number"
                value={form.contactNumber}
                onChange={(e) => set('contactNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Temporary password</Label>
              <Input type="text" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={6} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Price (₹)</Label>
              <Input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Billing cycle</Label>
              <Select value={form.billingCycle} onChange={(e) => set('billingCycle', e.target.value)}>
                {CYCLES.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Expiry is set automatically from the billing cycle.
          </p>
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
