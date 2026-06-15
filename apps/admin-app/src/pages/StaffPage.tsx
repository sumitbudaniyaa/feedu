import { useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
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
  useConfirm,
} from '@feedo/ui';
import { initials } from '@feedo/utils';
import type { StaffRole, User } from '@feedo/types';
import { staff as staffApi, useAuth } from '../lib/api.js';
import { PageHeader } from '../components/PageHeader.js';

const ROLES: StaffRole[] = ['manager', 'kitchen', 'waiter'];

export function StaffPage() {
  const { data: members, isLoading } = staffApi.useList();
  const remove = staffApi.useRemove();
  const confirm = useConfirm();
  const me = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Invite managers, kitchen staff and waiters with scoped access."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
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
                <p className="truncate text-xs text-muted-foreground">
                  {m.email}
                  {m.phone ? ` · ${m.phone}` : ''}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">
                {m.role}
              </Badge>
              {m.role !== 'owner' && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Edit"
                  onClick={() => {
                    setEditing(m);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {m.role !== 'owner' && m._id !== me?._id && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={async () => {
                    if (await confirm({ title: `Remove ${m.name}?`, description: 'They will lose access immediately.', confirmText: 'Remove', destructive: true }))
                      remove.mutate(m._id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </Card>
      ) : (
        <EmptyState icon={Users} title="No staff yet" description="Add your team to delegate access." />
      )}

      <StaffDialog open={open} onOpenChange={setOpen} member={editing} />
    </div>
  );
}

function StaffDialog({
  open,
  onOpenChange,
  member,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  member: User | null;
}) {
  const create = staffApi.useCreate();
  const update = staffApi.useUpdate();
  const editing = Boolean(member);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'waiter' as StaffRole });

  // Sync form when the target changes.
  const key = member?._id ?? 'new';
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setForm({
      name: member?.name ?? '',
      email: member?.email ?? '',
      phone: member?.phone ?? '',
      password: '',
      role: (member?.role as StaffRole) ?? 'waiter',
    });
  }

  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const onDone = { onSuccess: () => onOpenChange(false) };
    const phone = form.phone || undefined;
    if (editing && member) {
      update.mutate(
        { id: member._id, body: { name: form.name, email: form.email, phone, role: form.role, password: form.password || undefined } as Record<string, unknown> },
        onDone,
      );
    } else {
      create.mutate({ name: form.name, email: form.email, phone, password: form.password, role: form.role } as Record<string, unknown>, onDone);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit staff member' : 'Add staff member'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile number</Label>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{editing ? 'New password' : 'Password'}</Label>
              <Input
                type="text"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? 'Leave blank to keep current' : 'Min 8 characters'}
                required={!editing}
              />
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
          {error && (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed'}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
