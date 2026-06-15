import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Check, Plus } from 'lucide-react';
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
import { formatDate } from '@feedo/utils';
import { useBranches, useCreateBranch } from '../lib/api.js';
import { setActiveBranchId, useActiveBranchId } from '../store/branch.js';
import { PageHeader } from '../components/PageHeader.js';

export function BranchesPage() {
  const { data: branches, isLoading } = useBranches();
  const active = useActiveBranchId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const switchTo = (id: string) => {
    setActiveBranchId(id);
    qc.invalidateQueries();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        description="Outlets under your brand. Switch the active branch to manage its orders, staff and inventory."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add branch
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : branches && branches.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => {
            const isActive = (active ?? branches[0]?._id) === b._id;
            return (
              <Card key={b._id} className="flex flex-col p-4">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{b.name}</span>
                  <Badge variant={b.isLive ? 'success' : 'warning'}>{b.isLive ? 'Live' : 'Offline'}</Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">/{b.slug}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {b.contactNumber ? `${b.contactNumber} · ` : ''}added {formatDate(b.createdAt)}
                </p>
                <div className="mt-auto pt-3">
                  {isActive ? (
                    <Badge variant="accent" className="gap-1">
                      <Check className="h-3 w-3" /> Managing this branch
                    </Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => switchTo(b._id)}>
                      Manage this branch
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={Building2} title="No branches yet" description="Add your first branch to get started." />
      )}

      <AddBranchDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function AddBranchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateBranch();
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add branch</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(
              { name, contactNumber: contactNumber || undefined },
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
            The branch inherits the brand menu, branding and loyalty. Set branch-specific prices and
            stock from Inventory once you switch to it.
          </p>
          {create.isError && (
            <p className="text-sm text-destructive">
              {create.error instanceof Error ? create.error.message : 'Could not add branch'}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || !name}>
              {create.isPending ? 'Adding…' : 'Add branch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
