import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, ChevronDown, ChevronRight, Plus, Store } from 'lucide-react';
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
  Skeleton,
} from '@feedo/ui';
import { formatCurrency, formatDate } from '@feedo/utils';
import type { PlatformBrand } from '@feedo/api';
import { useBrands, useOnboardBranch } from '../lib/api.js';

export function BrandsPage() {
  const { data, isLoading } = useBrands();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each brand is a tenant; its outlets are branches that share the menu, branding and loyalty.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((brand) => (
            <BrandCard key={brand._id} brand={brand} />
          ))}
        </div>
      ) : (
        <EmptyState icon={Boxes} title="No brands yet" description="Onboard a restaurant to create its brand." />
      )}
    </div>
  );
}

function BrandCard({ brand }: { brand: PlatformBrand }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);

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
        <span className="hidden text-sm font-medium sm:block">{formatCurrency(brand.mrr)}/mo</span>
        <Badge variant="outline">
          {brand.liveBranchCount}/{brand.branchCount} live
        </Badge>
      </button>

      {open && (
        <div className="border-t border-border bg-background/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Branches</span>
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" /> Add branch
            </Button>
          </div>
          <div className="space-y-2">
            {brand.branches.map((b) => (
              <Link
                key={b._id}
                to={`/restaurants/${b._id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:bg-secondary/50"
              >
                <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    /{b.slug} · {b.orderCount} orders
                  </p>
                </div>
                <Badge variant={b.isLive ? 'success' : 'warning'}>{b.isLive ? 'Live' : 'Offline'}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
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
            The branch inherits the brand menu, branding, tax and loyalty automatically.
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
