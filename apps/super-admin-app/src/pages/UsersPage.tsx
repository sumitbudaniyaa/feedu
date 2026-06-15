import { useState } from 'react';
import { Pencil, Plus, ShieldCheck } from 'lucide-react';
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
import { initials } from '@feedo/utils';
import type { PlatformUser } from '@feedo/api';
import { useCreateEmployee, useUpdateEmployee, useUsers } from '../lib/api.js';

/** Company portal "Team" page — Feedu employees only (restaurant users live on
 *  each restaurant's detail page). */
export function UsersPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformUser | null>(null);
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
                <p className="truncate text-xs text-muted-foreground">
                  {u.email}
                  {u.phone ? ` · ${u.phone}` : ''}
                </p>
              </div>
              {!u.isActive && <Badge variant="destructive">Inactive</Badge>}
              <Badge variant="outline">Super admin</Badge>
              <Button size="icon" variant="ghost" onClick={() => setEditing(u)} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </Card>
      ) : (
        <EmptyState icon={ShieldCheck} title="No team members yet" description="Add a Feedu employee to give them platform access." />
      )}

      <EmployeeDialog open={addOpen} employee={null} onClose={() => setAddOpen(false)} />
      <EmployeeDialog open={Boolean(editing)} employee={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function EmployeeDialog({
  open,
  employee,
  onClose,
}: {
  open: boolean;
  employee: PlatformUser | null;
  onClose: () => void;
}) {
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const editing = Boolean(employee);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Sync form when the target changes.
  const key = employee?._id ?? 'new';
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setForm({ name: employee?.name ?? '', email: employee?.email ?? '', phone: employee?.phone ?? '', password: '' });
  }

  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const onDone = { onSuccess: () => onClose() };
    if (editing && employee) {
      update.mutate(
        { id: employee._id, body: { name: form.name, email: form.email, phone: form.phone, password: form.password || undefined } },
        onDone,
      );
    } else {
      create.mutate({ name: form.name, email: form.email, phone: form.phone || undefined, password: form.password }, onDone);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit team member' : 'Add Feedu team member'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile number</Label>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit number"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{editing ? 'New password' : 'Password'}</Label>
            <Input
              type="text"
              minLength={6}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder={editing ? 'Leave blank to keep current' : ''}
              required={!editing}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Could not save employee'}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
