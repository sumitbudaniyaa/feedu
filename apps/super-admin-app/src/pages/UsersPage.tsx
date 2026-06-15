import { useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
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
import { formatDate, initials } from '@feedo/utils';
import { useCreateEmployee, useUsers } from '../lib/api.js';

/** Company portal "Team" page — Feedu employees only (restaurant users live on
 *  each restaurant's detail page). */
export function UsersPage() {
  const [addOpen, setAddOpen] = useState(false);
  // Only the Feedu team (super_admin / employees collection).
  const { data, isLoading } = useUsers({ role: 'super_admin' });
  const team = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Feedu company employees with platform access. Restaurant staff are managed inside each restaurant.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add team member
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : team.length > 0 ? (
        <Card className="divide-y divide-border">
          {team.map((u) => (
            <div key={u._id} className="flex items-center gap-3 p-4">
              <Avatar>
                <AvatarFallback>{initials(u.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              {!u.isActive && <Badge variant="destructive">Inactive</Badge>}
              <Badge variant="outline">Super admin</Badge>
              <span className="hidden text-xs text-muted-foreground sm:block">{formatDate(u.createdAt)}</span>
            </div>
          ))}
        </Card>
      ) : (
        <EmptyState icon={ShieldCheck} title="No team members yet" description="Add a Feedu employee to give them platform access." />
      )}

      <AddEmployeeDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function AddEmployeeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateEmployee();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Feedu team member</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(form, {
              onSuccess: () => {
                onClose();
                setForm({ name: '', email: '', password: '' });
              },
            });
          }}
        >
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input type="text" minLength={6} value={form.password} onChange={(e) => set('password', e.target.value)} required />
          </div>
          <p className="text-xs text-muted-foreground">
            Feedu employees get full super-admin access and are never tied to a restaurant.
          </p>
          {create.isError && (
            <p className="text-sm text-destructive">
              {create.error instanceof Error ? create.error.message : 'Could not create employee'}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
