import { useState } from 'react';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
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
import type { LoyaltyRewardType } from '@feedo/types';
import { loyalty as loyaltyApi } from '../lib/api.js';
import { PageHeader } from '../components/PageHeader.js';

const TYPE_LABEL: Record<LoyaltyRewardType, string> = {
  repeat_order: 'Repeat order',
  points: 'Points',
  visit_based: 'Visit based',
  category_based: 'Category based',
};

export function LoyaltyPage() {
  const { data: programs, isLoading } = loyaltyApi.useList();
  const update = loyaltyApi.useUpdate();
  const remove = loyaltyApi.useRemove();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loyalty"
        description="Reward repeat customers with points, freebies and visit-based perks."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New reward
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
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
                onCheckedChange={(v) => update.mutate({ id: p._id, body: { isActive: v } })}
              />
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(p._id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="No loyalty rewards yet"
          description="Create your first reward — e.g. 10 points per ₹100 spent."
        />
      )}

      <RewardDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function RewardDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
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
          <DialogTitle>New loyalty reward</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Coffee club" required />
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
            <Label>Reward description</Label>
            <Input value={rewardDescription} onChange={(e) => setReward(e.target.value)} placeholder="Free dessert" />
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
