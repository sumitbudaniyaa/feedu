import { useState } from 'react';
import { Check, KeyRound, Pencil, Rocket } from 'lucide-react';
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
  Skeleton,
  Switch,
  Textarea,
  cn,
  useTheme,
} from '@feedo/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AccentKey, Restaurant } from '@feedo/types';
import { formatCurrency, formatDate } from '@feedo/utils';
import {
  apiClient,
  useChangePassword,
  useRestaurant,
  useSubscription,
  useUpdateRestaurant,
} from '../lib/api.js';
import { PageHeader } from '../components/PageHeader.js';

const ACCENTS: { key: AccentKey; hex: string }[] = [
  { key: 'violet', hex: '#8B5CF6' },
  { key: 'emerald', hex: '#10B981' },
  { key: 'blue', hex: '#3B82F6' },
  { key: 'amber', hex: '#F59E0B' },
  { key: 'rose', hex: '#F43F5E' },
  { key: 'slate', hex: '#64748B' },
];

const PLAN_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'accent'> = {
  active: 'success',
  trialing: 'accent',
  past_due: 'warning',
  cancelled: 'destructive',
};

type Section = 'details' | 'branding' | 'tax' | null;

export function SettingsPage() {
  const { data: restaurant, isLoading } = useRestaurant();
  const { data: subscription } = useSubscription();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Section>(null);
  const [pwOpen, setPwOpen] = useState(false);

  const goLive = useMutation({
    mutationFn: () => apiClient.post('/restaurants/me/go-live'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant'] }),
  });

  if (isLoading || !restaurant) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const accentHex = ACCENTS.find((a) => a.key === (restaurant.branding?.accent ?? 'violet'))?.hex;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Branding, tax and restaurant details."
        action={
          restaurant.isLive ? (
            <Badge variant="success">
              <Check className="h-3 w-3" /> Live
            </Badge>
          ) : (
            <Button onClick={() => goLive.mutate()} disabled={goLive.isPending}>
              <Rocket className="h-4 w-4" /> Go live
            </Button>
          )
        }
      />

      {/* Restaurant details */}
      <SectionCard title="Restaurant details" onEdit={() => setEditing('details')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <SubRow label="Name"><span className="font-medium">{restaurant.name}</span></SubRow>
          <SubRow label="Contact"><span className="font-medium">{restaurant.contactNumber || '—'}</span></SubRow>
          <SubRow label="Cuisine">
            <span className="font-medium">{(restaurant.cuisineType ?? []).join(', ') || '—'}</span>
          </SubRow>
          <SubRow label="Description">
            <span className="font-medium">{restaurant.description || '—'}</span>
          </SubRow>
        </div>
      </SectionCard>

      {/* Branding */}
      <SectionCard title="Branding" onEdit={() => setEditing('branding')}>
        <SubRow label="Accent color">
          <span className="inline-flex items-center gap-2 font-medium capitalize">
            <span className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: accentHex }} />
            {restaurant.branding?.accent ?? 'violet'}
          </span>
        </SubRow>
      </SectionCard>

      {/* Tax */}
      <SectionCard title="Tax (GST)" onEdit={() => setEditing('tax')}>
        <div className="grid gap-4 sm:grid-cols-3">
          <SubRow label="GST number"><span className="font-medium">{restaurant.tax?.gstNumber || '—'}</span></SubRow>
          <SubRow label="GST percent"><span className="font-medium">{restaurant.tax?.gstPercent ?? 5}%</span></SubRow>
          <SubRow label="Prices include tax">
            <span className="font-medium">{restaurant.tax?.inclusive ? 'Yes' : 'No'}</span>
          </SubRow>
        </div>
      </SectionCard>

      {/* Subscription — managed by Feedu, read-only here. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <SubRow label="Plan">
                <span className="font-medium capitalize">{subscription.plan}</span>
                <Badge variant={PLAN_VARIANT[subscription.status] ?? 'accent'} className="capitalize">
                  {subscription.status.replace('_', ' ')}
                </Badge>
              </SubRow>
              <SubRow label="Price">
                <span className="font-medium">
                  {subscription.price ? `${formatCurrency(subscription.price)} / ${subscription.billingCycle}` : '—'}
                </span>
              </SubRow>
              <SubRow label="Renews / expires">
                <span className="font-medium">
                  {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : '—'}
                </span>
              </SubRow>
              <SubRow label="Seats">
                <span className="font-medium">{subscription.seats}</span>
              </SubRow>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Billing is managed by Feedu. Contact support to change your plan.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No subscription on file yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Owner password</p>
            <p className="text-xs text-muted-foreground">Change the password you use to sign in.</p>
          </div>
          <Button variant="outline" onClick={() => setPwOpen(true)}>
            <KeyRound className="h-4 w-4" /> Change password
          </Button>
        </CardContent>
      </Card>

      <DetailsDialog open={editing === 'details'} onClose={() => setEditing(null)} restaurant={restaurant} />
      <BrandingDialog open={editing === 'branding'} onClose={() => setEditing(null)} restaurant={restaurant} />
      <TaxDialog open={editing === 'tax'} onClose={() => setEditing(null)} restaurant={restaurant} />
      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </div>
  );
}

function SectionCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SubRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function DetailsDialog({ open, onClose, restaurant }: { open: boolean; onClose: () => void; restaurant: Restaurant }) {
  const update = useUpdateRestaurant();
  const [form, setForm] = useState({
    name: restaurant.name ?? '',
    contactNumber: restaurant.contactNumber ?? '',
    cuisine: (restaurant.cuisineType ?? []).join(', '),
    description: restaurant.description ?? '',
  });
  const invalid = Boolean(form.contactNumber) && !/^\d{10}$/.test(form.contactNumber);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    update.mutate(
      {
        name: form.name,
        contactNumber: form.contactNumber || undefined,
        cuisineType: form.cuisine ? form.cuisine.split(',').map((s) => s.trim()).filter(Boolean) : [],
        description: form.description || undefined,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit restaurant details</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Contact number</Label>
            <Input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.contactNumber}
              onChange={(e) => setForm({ ...form, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              placeholder="10-digit mobile number"
            />
            {invalid && <p className="text-xs text-destructive">Enter a valid 10-digit number.</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Cuisine (comma separated)</Label>
            <Input value={form.cuisine} onChange={(e) => setForm({ ...form, cuisine: e.target.value })} placeholder="Indian, Continental" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={update.isPending || invalid}>{update.isPending ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BrandingDialog({ open, onClose, restaurant }: { open: boolean; onClose: () => void; restaurant: Restaurant }) {
  const update = useUpdateRestaurant();
  const { setAccent } = useTheme();
  const [accent, setLocalAccent] = useState<AccentKey>((restaurant.branding?.accent as AccentKey) ?? 'violet');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(
      { branding: { accent, themeMode: restaurant.branding?.themeMode ?? 'dark' } },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit branding</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label>Accent color</Label>
            <div className="flex flex-wrap gap-3">
              {ACCENTS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => {
                    setLocalAccent(a.key);
                    setAccent(a.key); // live preview
                  }}
                  className={cn(
                    'h-9 w-9 rounded-full border-2 transition-transform hover:scale-110',
                    accent === a.key ? 'border-foreground' : 'border-transparent',
                  )}
                  style={{ backgroundColor: a.hex }}
                  aria-label={a.key}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaxDialog({ open, onClose, restaurant }: { open: boolean; onClose: () => void; restaurant: Restaurant }) {
  const update = useUpdateRestaurant();
  const [gstNumber, setGstNumber] = useState(restaurant.tax?.gstNumber ?? '');
  const [gstPercent, setGstPercent] = useState(String(restaurant.tax?.gstPercent ?? 5));
  const [inclusive, setInclusive] = useState(restaurant.tax?.inclusive ?? false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(
      { tax: { gstNumber: gstNumber || undefined, gstPercent: Number(gstPercent), inclusive } },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit tax (GST)</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>GST number</Label>
              <Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>GST percent</Label>
              <Input type="number" min="0" max="100" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={inclusive} onCheckedChange={setInclusive} /> Prices include tax
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setDone(false);
    change.reset();
  };

  const mismatch = Boolean(confirm) && next !== confirm;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch || next.length < 8) return;
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setDone(true);
          setTimeout(() => {
            onOpenChange(false);
            reset();
          }, 1200);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change owner password</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label>Current password</Label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>New password</Label>
            <Input type="password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} placeholder="Min 8 characters" required />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm new password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            {mismatch && <p className="text-xs text-destructive">Passwords don&apos;t match.</p>}
          </div>
          {change.isError && (
            <p className="text-sm text-destructive">
              {change.error instanceof Error ? change.error.message : 'Could not change password'}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant={done ? 'success' : 'default'} disabled={change.isPending || mismatch || !next}>
              {change.isPending ? 'Saving…' : done ? (
                <>
                  <Check className="h-4 w-4" /> Changed
                </>
              ) : (
                'Update password'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
