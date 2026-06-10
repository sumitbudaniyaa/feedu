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
import { apiClient, useRestaurant, useUpdateRestaurant } from '../lib/api.js';
import { PageHeader } from '../components/PageHeader.js';

const ACCENTS: { key: AccentKey; hex: string }[] = [
  { key: 'violet', hex: '#8B5CF6' },
  { key: 'emerald', hex: '#10B981' },
  { key: 'blue', hex: '#3B82F6' },
  { key: 'amber', hex: '#F59E0B' },
  { key: 'rose', hex: '#F43F5E' },
  { key: 'slate', hex: '#64748B' },
];

export function SettingsPage() {
  const { data: restaurant, isLoading } = useRestaurant();
  const update = useUpdateRestaurant();
  const { setAccent } = useTheme();
  const qc = useQueryClient();

  const [form, setForm] = useState({ name: '', description: '', contactNumber: '', cuisine: '' });
  const [accent, setLocalAccent] = useState<AccentKey>('violet');
  const [gstNumber, setGstNumber] = useState('');
  const [gstPercent, setGstPercent] = useState('5');
  const [inclusive, setInclusive] = useState(false);

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

  const save = () => {
    update.mutate({
      name: form.name,
      description: form.description || undefined,
      contactNumber: form.contactNumber || undefined,
      cuisineType: form.cuisine ? form.cuisine.split(',').map((s) => s.trim()).filter(Boolean) : [],
      branding: { accent, themeMode: restaurant?.branding?.themeMode ?? 'dark' },
      tax: { gstNumber: gstNumber || undefined, gstPercent: Number(gstPercent), inclusive },
    });
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
            <Input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
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

      <div className="flex justify-end">
        <Button onClick={save} disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
