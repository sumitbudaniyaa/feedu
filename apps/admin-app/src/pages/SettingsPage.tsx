import { useEffect, useState } from 'react';
import { Check, Rocket } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
  Switch,
  Textarea,
  cn,
  useTheme,
} from '@feedo/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AccentKey } from '@feedo/types';
import { formatCurrency, formatDate } from '@feedo/utils';
import { apiClient, useRestaurant, useSubscription, useUpdateRestaurant } from '../lib/api.js';
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

export function SettingsPage() {
  const { data: restaurant, isLoading } = useRestaurant();
  const { data: subscription } = useSubscription();
  const update = useUpdateRestaurant();
  const { setAccent } = useTheme();
  const qc = useQueryClient();

  const [form, setForm] = useState({ name: '', description: '', contactNumber: '', cuisine: '' });
  const [accent, setLocalAccent] = useState<AccentKey>('violet');
  const [gstNumber, setGstNumber] = useState('');
  const [gstPercent, setGstPercent] = useState('5');
  const [inclusive, setInclusive] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!restaurant) return;
    setForm({
      name: restaurant.name ?? '',
      description: restaurant.description ?? '',
      contactNumber: restaurant.contactNumber ?? '',
      cuisine: (restaurant.cuisineType ?? []).join(', '),
    });
    setLocalAccent(restaurant.branding?.accent ?? 'violet');
    setGstNumber(restaurant.tax?.gstNumber ?? '');
    setGstPercent(String(restaurant.tax?.gstPercent ?? 5));
    setInclusive(restaurant.tax?.inclusive ?? false);
  }, [restaurant]);

  const goLive = useMutation({
    mutationFn: () => apiClient.post('/restaurants/me/go-live'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant'] }),
  });

  const contactInvalid = Boolean(form.contactNumber) && !/^\d{10}$/.test(form.contactNumber);

  const save = () => {
    if (contactInvalid) return;
    update.mutate(
      {
        name: form.name,
        description: form.description || undefined,
        contactNumber: form.contactNumber || undefined,
        cuisineType: form.cuisine ? form.cuisine.split(',').map((s) => s.trim()).filter(Boolean) : [],
        branding: { accent, themeMode: restaurant?.branding?.themeMode ?? 'dark' },
        tax: { gstNumber: gstNumber || undefined, gstPercent: Number(gstPercent), inclusive },
      },
      {
        onSuccess: () => {
          setJustSaved(true);
          setTimeout(() => setJustSaved(false), 2500);
        },
      },
    );
  };

  if (isLoading || !restaurant) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Restaurant details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Contact number</Label>
            <Input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.contactNumber}
              onChange={(e) =>
                setForm({ ...form, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })
              }
              placeholder="10-digit mobile number"
            />
            {form.contactNumber && !/^\d{10}$/.test(form.contactNumber) && (
              <p className="text-xs text-destructive">Enter a valid 10-digit number.</p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Cuisine (comma separated)</Label>
            <Input value={form.cuisine} onChange={(e) => setForm({ ...form, cuisine: e.target.value })} placeholder="Indian, Continental" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tax (GST)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>GST number</Label>
            <Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>GST percent</Label>
            <Input type="number" min="0" max="100" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Switch checked={inclusive} onCheckedChange={setInclusive} /> Prices include tax
          </label>
        </CardContent>
      </Card>

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

      <div className="flex items-center justify-end gap-3">
        {update.isError && (
          <p className="text-sm text-destructive">
            {update.error instanceof Error ? update.error.message : 'Could not save changes'}
          </p>
        )}
        <Button
          onClick={save}
          disabled={update.isPending || contactInvalid}
          variant={justSaved ? 'success' : 'default'}
        >
          {update.isPending ? (
            'Saving…'
          ) : justSaved ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            'Save changes'
          )}
        </Button>
      </div>
    </div>
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
