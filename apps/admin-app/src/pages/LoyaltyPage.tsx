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
} from '@feedo/ui';
import { formatRelativeTime } from '@feedo/utils';
import type { LoyaltyReward, LoyaltyRewardType, Product } from '@feedo/types';
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

  const [programOpen, setProgramOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Loyalty"
        description="How diners earn points, and what they can claim with them."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setProgramOpen(true)}>
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
                    <Button size="icon" variant="ghost" onClick={() => removeReward.mutate(r._id)}>
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
                <Button size="icon" variant="ghost" onClick={() => removeProgram.mutate(p._id)}>
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
      <ProgramDialog open={programOpen} onOpenChange={setProgramOpen} />
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

function ProgramDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = loyaltyApi.useCreate();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<LoyaltyRewardType>('points');
  const [rewardDescription, setReward] = useState('');
  const [pointsPerCurrency, setPpc] = useState('0.1');
  const [everyNthOrder, setNth] = useState('5');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const conditions =
      type === 'points'
        ? { pointsPerCurrency: Number(pointsPerCurrency) }
        : type === 'repeat_order'
          ? { everyNthOrder: Number(everyNthOrder) }
          : {};
    create.mutate(
      { title, type, isActive: true, conditions, rewardDescription: rewardDescription || undefined },
      {
        onSuccess: () => {
          onOpenChange(false);
          setTitle('');
          setReward('');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New earning rule</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Copper Rewards" required />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value as LoyaltyRewardType)}>
              {(Object.keys(TYPE_LABEL) as LoyaltyRewardType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </div>
          {type === 'points' && (
            <div className="space-y-1.5">
              <Label>Points per ₹1 spent</Label>
              <Input type="number" step="0.01" min="0" value={pointsPerCurrency} onChange={(e) => setPpc(e.target.value)} />
            </div>
          )}
          {type === 'repeat_order' && (
            <div className="space-y-1.5">
              <Label>Reward every Nth order</Label>
              <Input type="number" min="1" value={everyNthOrder} onChange={(e) => setNth(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={rewardDescription} onChange={(e) => setReward(e.target.value)} placeholder="Earn 10 pts per ₹100" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || !title}>
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
