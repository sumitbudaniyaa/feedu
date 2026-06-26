import { useState } from 'react';
import { BadgeCheck, Coins, Gift, Plus, Sparkles, Ticket, Trash2, X } from 'lucide-react';
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
  Switch,
  useConfirm,
} from '@feedo/ui';
import { formatRelativeTime } from '@feedo/utils';
import type { LoyaltyProgram, LoyaltyReward, LoyaltyRewardType, Product } from '@feedo/types';
import {
  loyalty as loyaltyApi,
  products as productsApi,
  rewards as rewardsApi,
  useRedemptions,
  useUpdateRedemption,
} from '../lib/api.js';
import { PageHeader } from '../components/PageHeader.js';

const TYPE_LABEL: Record<LoyaltyRewardType, string> = {
  repeat_order: 'Repeat order',
  points: 'Points',
  visit_based: 'Visit based',
  category_based: 'Category based',
};

export function LoyaltyPage() {
  const { data: programs, isLoading } = loyaltyApi.useList();
  const { data: rewardList, isLoading: rewardsLoading } = rewardsApi.useList();
  const { data: products } = productsApi.useList();
  const updateProgram = loyaltyApi.useUpdate();
  const removeProgram = loyaltyApi.useRemove();
  const updateReward = rewardsApi.useUpdate();
  const removeReward = rewardsApi.useRemove();
  const confirm = useConfirm();

  const [programOpen, setProgramOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<LoyaltyProgram | null>(null);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Loyalty"
        description="How diners earn points, and what they can claim with them."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditingProgram(null);
                setProgramOpen(true);
              }}
            >
              <Coins className="h-4 w-4" /> Earning rule
            </Button>
            <Button
              onClick={() => {
                setEditingReward(null);
                setRewardOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New reward
            </Button>
          </div>
        }
      />

      {/* Rewards catalog */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Gift className="h-4 w-4" /> Rewards catalog
        </h2>
        {rewardsLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : rewardList && rewardList.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rewardList.map((r) => (
              <Card key={r._id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15">
                    <Gift className="h-4 w-4 text-accent" />
                  </div>
                  <Badge variant="accent">{r.pointsCost} pts</Badge>
                </div>
                <p className="mt-3 font-medium">{r.title}</p>
                {r.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                )}
                {!r.productId && (
                  <p className="mt-1 text-xs font-medium text-warning">
                    ⚠ Link an item so diners can order it
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between pt-4">
                  <Switch
                    checked={r.isActive}
                    onCheckedChange={(v) => updateReward.mutate({ id: r._id, body: { isActive: v } })}
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingReward(r);
                        setRewardOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        if (await confirm({ title: `Delete "${r.title}"?`, confirmText: 'Delete', destructive: true }))
                          removeReward.mutate(r._id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Gift}
            title="No rewards yet"
            description='Create one — e.g. "Free Coffee" for 50 points. Diners see it instantly with their eligibility.'
          />
        )}
      </section>

      {/* Redemptions */}
      <RedemptionsSection />

      {/* Earning rules */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Coins className="h-4 w-4" /> Earning rules
        </h2>
        <p className="text-xs text-muted-foreground">
          Tip: set points per item in Inventory for precise control. These rules apply when items
          don&apos;t define their own points.
        </p>
        {isLoading ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : programs && programs.length > 0 ? (
          <div className="space-y-3">
            {programs.map((p) => (
              <Card key={p._id} className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15">
                  <Sparkles className="h-4 w-4 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{p.title}</p>
                    <Badge variant="outline">{TYPE_LABEL[p.type]}</Badge>
                  </div>
                  {p.rewardDescription && (
                    <p className="truncate text-xs text-muted-foreground">{p.rewardDescription}</p>
                  )}
                </div>
                <Switch
                  checked={p.isActive}
                  onCheckedChange={(v) => updateProgram.mutate({ id: p._id, body: { isActive: v } })}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingProgram(p);
                    setProgramOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={async () => {
                    if (await confirm({ title: `Delete "${p.title}"?`, confirmText: 'Delete', destructive: true }))
                      removeProgram.mutate(p._id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed p-4 text-sm text-muted-foreground">
            No fallback earning rule. Items without their own points won&apos;t accrue any.
          </Card>
        )}
      </section>

      <RewardDialog
        open={rewardOpen}
        onOpenChange={setRewardOpen}
        reward={editingReward}
        products={products ?? []}
      />
      <ProgramDialog
        open={programOpen}
        onOpenChange={setProgramOpen}
        program={editingProgram}
        products={products ?? []}
      />
    </div>
  );
}

function RedemptionsSection() {
  const { data: redemptions, isLoading } = useRedemptions();
  const update = useUpdateRedemption();

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Ticket className="h-4 w-4" /> Claims
      </h2>
      {isLoading ? (
        <Skeleton className="h-20 rounded-xl" />
      ) : redemptions && redemptions.length > 0 ? (
        <Card className="divide-y divide-border">
          {redemptions.map((r) => (
            <div key={r._id} className="flex flex-wrap items-center gap-3 p-4">
              <code className="rounded-md bg-secondary px-2 py-1 font-mono text-sm font-bold tracking-widest">
                {r.code}
              </code>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.rewardTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {r.customerName || 'Guest'} · {r.customerPhone} · {r.pointsCost} pts ·{' '}
                  {formatRelativeTime(r.createdAt)}
                </p>
              </div>
              {r.status === 'pending' ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => update.mutate({ id: r._id, status: 'fulfilled' })}>
                    <BadgeCheck className="h-4 w-4" /> Fulfil
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => update.mutate({ id: r._id, status: 'cancelled' })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Badge variant={r.status === 'fulfilled' ? 'success' : 'destructive'} className="capitalize">
                  {r.status}
                </Badge>
              )}
            </div>
          ))}
        </Card>
      ) : (
        <Card className="border-dashed p-4 text-sm text-muted-foreground">
          No claims yet. When a diner redeems a reward, it shows here with a claim code.
        </Card>
      )}
    </section>
  );
}

function RewardDialog({
  open,
  onOpenChange,
  reward,
  products,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reward: LoyaltyReward | null;
  products: Product[];
}) {
  const create = rewardsApi.useCreate();
  const update = rewardsApi.useUpdate();
  const pending = create.isPending || update.isPending;

  const [form, setForm] = useState(() => initialReward(reward));
  const key = reward?._id ?? 'new';
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setForm(initialReward(reward));
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      title: form.title,
      description: form.description || undefined,
      pointsCost: Number(form.pointsCost),
      productId: form.productId || null,
      isActive: true,
    };
    const onDone = { onSuccess: () => onOpenChange(false) };
    if (reward) update.mutate({ id: reward._id, body }, onDone);
    else create.mutate(body, onDone);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{reward ? 'Edit reward' : 'New reward'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Free Coffee"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Points cost</Label>
              <Input
                type="number"
                min="1"
                value={form.pointsCost}
                onChange={(e) => setForm({ ...form, pointsCost: e.target.value })}
                placeholder="50"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Free item</Label>
              <Select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                required
              >
                <option value="" disabled>
                  Select an item…
                </option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <p className="-mt-1 text-xs text-muted-foreground">
            Diners add this item to their order for free using points — it goes straight to the kitchen.
          </p>
          {products.length === 0 && (
            <p className="text-xs text-destructive">Add a product in Inventory first.</p>
          )}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Any regular hot coffee, on us."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !form.title || !form.pointsCost || !form.productId}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function initialReward(reward: LoyaltyReward | null) {
  return {
    title: reward?.title ?? '',
    description: reward?.description ?? '',
    pointsCost: reward ? String(reward.pointsCost) : '',
    productId: reward?.productId ?? '',
  };
}

// Only two earning systems are offered.
const PROGRAM_TYPES: LoyaltyRewardType[] = ['points', 'visit_based'];

function ProgramDialog({
  open,
  onOpenChange,
  program,
  products,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  program: LoyaltyProgram | null;
  products: Product[];
}) {
  const create = loyaltyApi.useCreate();
  const update = loyaltyApi.useUpdate();
  const pending = create.isPending || update.isPending;

  const [form, setForm] = useState(() => initialProgram(program));
  const key = program?._id ?? 'new';
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setForm(initialProgram(program));
  }

  const set = <K extends keyof ReturnType<typeof initialProgram>>(
    k: K,
    v: ReturnType<typeof initialProgram>[K],
  ) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const conditions =
      form.type === 'points'
        ? { pointsPerCurrency: Number(form.pointsPerCurrency) }
        : { requiredVisits: Number(form.requiredVisits) };
    const body = {
      title: form.title,
      type: form.type,
      isActive: true,
      conditions,
      rewardProductId: form.type === 'visit_based' ? form.rewardProductId || undefined : undefined,
      rewardDescription: form.rewardDescription || undefined,
      expiryDays: form.type === 'points' && form.canExpire ? Number(form.expiryDays) : 0,
    };
    const onDone = { onSuccess: () => onOpenChange(false) };
    if (program) update.mutate({ id: program._id, body }, onDone);
    else create.mutate(body, onDone);
  };

  const visit = form.type === 'visit_based';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{program ? 'Edit earning rule' : 'New earning rule'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Copper Rewards" required />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onChange={(e) => set('type', e.target.value as LoyaltyRewardType)}>
              {PROGRAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </div>

          {form.type === 'points' && (
            <div className="space-y-1.5">
              <Label>Points per ₹1 spent</Label>
              <Input type="number" step="0.01" min="0" value={form.pointsPerCurrency} onChange={(e) => set('pointsPerCurrency', e.target.value)} />
            </div>
          )}

          {visit && (
            <>
              <div className="space-y-1.5">
                <Label>Free reward after how many visits?</Label>
                <Input type="number" min="1" value={form.requiredVisits} onChange={(e) => set('requiredVisits', e.target.value)} placeholder="10" />
                <p className="text-xs text-muted-foreground">
                  A stamp is added on each paid visit — at this many, the diner can claim the free item.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Free item</Label>
                <Select value={form.rewardProductId} onChange={(e) => set('rewardProductId', e.target.value)} required>
                  <option value="" disabled>
                    Select an item…
                  </option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                {products.length === 0 && <p className="text-xs text-destructive">Add a product in Inventory first.</p>}
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={form.rewardDescription}
              onChange={(e) => set('rewardDescription', e.target.value)}
              placeholder={visit ? 'Buy 9, get the 10th free' : 'Earn 10 pts per ₹100'}
            />
          </div>

          {/* Points expiry (points programs only) */}
          {form.type === 'points' && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium">Points can expire</span>
                <Switch checked={form.canExpire} onCheckedChange={(v) => set('canExpire', v)} />
              </label>
              {form.canExpire && (
                <div className="space-y-1.5">
                  <Label>Expire after (days of inactivity)</Label>
                  <Input type="number" min="1" value={form.expiryDays} onChange={(e) => set('expiryDays', e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    A diner&apos;s points reset to 0 if they don&apos;t order within this many days.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !form.title || (visit && !form.rewardProductId)}>
              {pending ? 'Saving…' : program ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function initialProgram(p: LoyaltyProgram | null) {
  return {
    title: p?.title ?? '',
    type: (p?.type === 'visit_based' ? 'visit_based' : 'points') as LoyaltyRewardType,
    pointsPerCurrency: p?.conditions?.pointsPerCurrency != null ? String(p.conditions.pointsPerCurrency) : '0.1',
    requiredVisits: p?.conditions?.requiredVisits != null ? String(p.conditions.requiredVisits) : '10',
    rewardProductId: p?.rewardProductId ?? '',
    rewardDescription: p?.rewardDescription ?? '',
    canExpire: Boolean(p?.expiryDays && p.expiryDays > 0),
    expiryDays: p?.expiryDays ? String(p.expiryDays) : '90',
  };
}
