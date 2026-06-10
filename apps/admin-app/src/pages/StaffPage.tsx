import { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
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
  Select,
  Skeleton,
} from '@feedo/ui';
import { initials } from '@feedo/utils';
import type { StaffRole } from '@feedo/types';
import { staff as staffApi, useAuth } from '../lib/api.js';
import { PageHeader } from '../components/PageHeader.js';

const ROLES: StaffRole[] = ['manager', 'kitchen', 'waiter'];

export function StaffPage() {
  const { data: members, isLoading } = staffApi.useList();
  const remove = staffApi.useRemove();
  const me = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Invite managers, kitchen staff and waiters with scoped access."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add staff
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : members && members.length > 0 ? (
        <Card className="divide-y divide-border">
          {members.map((m) => (
            <div key={m._id} className="flex items-center gap-3 p-4">
              <Avatar>
                <AvatarFallback>{initials(m.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.name}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              <Badge variant="outline" className="capitalize">
                {m.role}
              </Badge>
              {m.role !== 'owner' && m._id !== me?._id && (
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(m._id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </Card>
      ) : (
        <EmptyState icon={Users} title="No staff yet" description="Add your team to delegate access." />
      )}

      <StaffDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function StaffDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = staffApi.useCreate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'waiter' as StaffRole });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(form as Record<string, unknown>, {
      onSuccess: () => {
        onOpenChange(false);
        setForm({ name: '', email: '', password: '', role: 'waiter' });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add staff member</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" required />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
                {ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {create.error && (
            <p className="text-sm text-destructive">
              {create.error instanceof Error ? create.error.message : 'Failed'}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Adding…' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
