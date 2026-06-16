import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronDown, ChevronRight, Plus, Power, Search, Store, X } from 'lucide-react';
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
import type { PlatformBrand } from '@feedo/api';
import { useBrands, useOnboardBranch, useOnboardRestaurant, useToggleLive } from '../lib/api.js';

const CYCLES = ['monthly', 'quarterly', 'yearly'] as const;
type Cycle = (typeof CYCLES)[number];

type TypeFilter = 'all' | 'single' | 'multi';
type StatusFilter = 'all' | 'live' | 'offline';

/**
 * Combined accounts page: every brand and its branches (single-store brands
 * read as one outlet), with onboarding and filters.
 */
export function RestaurantsPage() {
  const { data, isLoading } = useBrands();
  const [onboarding, setOnboarding] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((b) => {
      if (type !== 'all' && b.accountType !== type) return false;
      if (status === 'live' && b.liveBranchCount === 0) return false;
      if (status === 'offline' && b.liveBranchCount > 0) return false;
      if (q) {
        const hay = `${b.name} ${b.slug} ${b.branches.map((x) => `${x.name} ${x.slug}`).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, type, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Brands &amp; Restaurants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every account and its branches. Open one to manage its plan, pricing and access.
          </p>
        </div>
        <Button onClick={() => setOnboarding(true)}>
          <Plus className="h-4 w-4" /> Onboard
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brand or branch…"
            className="pl-8"
          />
        </div>
        <Select value={type} onChange={(e) => setType(e.target.value as TypeFilter)} className="w-40">
          <option value="all">All types</option>
          <option value="single">Single store</option>
          <option value="multi">Multi-store</option>
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="w-36">
          <option value="all">All status</option>
          <option value="live">Live</option>
          <option value="offline">Offline</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((brand) => (
            <BrandCard key={brand._id} brand={brand} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title={data && data.length ? 'No matches' : 'No accounts yet'}
          description={data && data.length ? 'Try a different search or filter.' : 'Onboard a restaurant or brand to get started.'}
        />
      )}

      <OnboardDialog open={onboarding} onClose={() => setOnboarding(false)} />
    </div>
  );
}

function BrandCard({ brand }: { brand: PlatformBrand }) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const toggleLive = useToggleLive();
  const confirm = useConfirm();

  const suspend = async (branchId: string, name: string, live: boolean) => {
    const ok = await confirm({
      title: live ? `Suspend ${name}?` : `Reactivate ${name}?`,
      description: live
        ? 'The branch goes offline — its customer menu shows “not found” and staff are locked out.'
        : 'The branch goes back online and can take orders again.',
      confirmText: live ? 'Suspend' : 'Reactivate',
    });
    if (ok) toggleLive.mutate({ id: branchId, isLive: !live });
  };

  const single = brand.accountType !== 'multi';

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-secondary/50"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-sm font-medium">
          {brand.name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{brand.name}</p>
          <p className="text-xs text-muted-foreground">
            {brand.branchCount} {brand.branchCount === 1 ? 'branch' : 'branches'} · {brand.liveBranchCount} live ·{' '}
            {brand.totalOrders} orders · joined {formatDate(brand.createdAt)}
          </p>
        </div>
        <span className="hidden text-sm font-medium sm:block">
          {formatCurrency(brand.mrr)}/mo{brand.accountType === 'multi' ? ' combined' : ''}
        </span>
        <Badge variant={brand.accountType === 'multi' ? 'accent' : 'outline'}>
          {brand.accountType === 'multi' ? 'Multi-store' : 'Single store'}
        </Badge>
        <Badge variant="outline">
          {brand.liveBranchCount}/{brand.branchCount} live
        </Badge>
      </button>

      {open && (
        <div className="border-t border-border bg-background/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {single ? 'Outlet' : 'Branches'}
            </span>
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" /> Add branch
            </Button>
          </div>
          <div className="space-y-2">
            {brand.branches.map((b) => (
              <div
                key={b._id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Link to={`/restaurants/${b._id}`} className="group min-w-0 flex-1">
                  <p className="truncate text-sm font-medium group-hover:underline">{b.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    /{b.slug} · {b.orderCount} orders
                  </p>
                </Link>
                <Badge variant={b.isLive ? 'success' : 'warning'}>{b.isLive ? 'Live' : 'Offline'}</Badge>
                <Button
                  size="sm"
                  variant={b.isLive ? 'outline' : 'default'}
                  onClick={() => suspend(b._id, b.name, b.isLive)}
                  disabled={toggleLive.isPending}
                >
                  <Power className="h-3.5 w-3.5" /> {b.isLive ? 'Suspend' : 'Reactivate'}
                </Button>
                <Link to={`/restaurants/${b._id}`} aria-label="Open branch" className="text-muted-foreground hover:text-foreground">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <AddBranchDialog brand={brand} open={adding} onClose={() => setAdding(false)} />
    </Card>
  );
}

function AddBranchDialog({ brand, open, onClose }: { brand: PlatformBrand; open: boolean; onClose: () => void }) {
  const onboard = useOnboardBranch();
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add branch to {brand.name}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onboard.mutate(
              { brandId: brand._id, body: { name, contactNumber: contactNumber || undefined } },
              {
                onSuccess: () => {
                  onClose();
                  setName('');
                  setContactNumber('');
                },
              },
            );
          }}
        >
          <div className="space-y-1.5">
            <Label>Branch name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Indiranagar" required />
          </div>
          <div className="space-y-1.5">
            <Label>Mobile number</Label>
            <Input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit number"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Adding a branch makes this a multi-store account. It inherits the brand menu, branding, tax and
            loyalty automatically.
          </p>
          {onboard.isError && (
            <p className="text-sm text-destructive">
              {onboard.error instanceof Error ? onboard.error.message : 'Could not add branch'}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={onboard.isPending || !name}>
              {onboard.isPending ? 'Adding…' : 'Add branch'}
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
    contactNumber: '',
    password: '',
    price: '0',
    billingCycle: 'monthly' as Cycle,
    accountType: 'single' as 'single' | 'multi',
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  // Multi-store: the brand's outlets, entered during onboarding.
  const [branches, setBranches] = useState<string[]>(['']);
  const setBranch = (i: number, v: string) => setBranches((b) => b.map((x, idx) => (idx === i ? v : x)));
  const addBranch = () => setBranches((b) => [...b, '']);
  const removeBranch = (i: number) => setBranches((b) => (b.length > 1 ? b.filter((_, idx) => idx !== i) : b));

  const reset = () => {
    setForm({ restaurantName: '', ownerName: '', email: '', contactNumber: '', password: '', price: '0', billingCycle: 'monthly', accountType: 'single' });
    setBranches(['']);
  };

  const isMulti = form.accountType === 'multi';
  const cleanBranches = branches.map((b) => b.trim()).filter(Boolean);

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
        accountType: form.accountType,
        branches: isMulti ? cleanBranches : undefined,
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
          <DialogTitle>Onboard {isMulti ? 'a brand' : 'a restaurant'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          {/* Single store vs multi-store chain. */}
          <div className="space-y-1.5">
            <Label>Account type</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['single', 'multi'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('accountType', t)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    form.accountType === t
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:bg-secondary/50'
                  }`}
                >
                  <span className="font-medium">{t === 'single' ? 'Single store' : 'Multi-store'}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t === 'single' ? 'One outlet, billed on its own' : 'A chain billed once for all branches'}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{isMulti ? 'Brand name' : 'Restaurant name'}</Label>
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
              <Label>{isMulti ? 'Brand mobile' : 'Restaurant mobile'}</Label>
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

          {/* Multi-store: the brand's outlets, added during onboarding. */}
          {isMulti && (
            <div className="space-y-1.5 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <Label>Branches</Label>
                <Button type="button" size="sm" variant="outline" onClick={addBranch}>
                  <Plus className="h-3.5 w-3.5" /> Add branch
                </Button>
              </div>
              <div className="space-y-2">
                {branches.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={b}
                      onChange={(e) => setBranch(i, e.target.value)}
                      placeholder={`Branch ${i + 1} name (e.g. Indiranagar)`}
                    />
                    {branches.length > 1 && (
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeBranch(i)} aria-label="Remove branch">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                One combined fee covers all branches. You can add more later from this page.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{isMulti ? 'Combined brand fee (₹)' : 'Price (₹)'}</Label>
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
            {isMulti && ' This single fee covers every branch.'}
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
            <Button type="submit" disabled={onboard.isPending || (isMulti && cleanBranches.length === 0)}>
              {onboard.isPending ? 'Creating…' : isMulti ? 'Create brand' : 'Create restaurant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
