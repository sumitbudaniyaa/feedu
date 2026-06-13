import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { Avatar, AvatarFallback, Badge, Card, EmptyState, Input, Select, Skeleton } from '@feedo/ui';
import { formatDate, initials } from '@feedo/utils';
import { useUsers } from '../lib/api.js';

const ROLES = ['owner', 'manager', 'kitchen', 'waiter', 'super_admin'];

export function UsersPage() {
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useUsers({ role: role || undefined, search: search || undefined });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every account across the platform.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select className="w-40" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r} className="capitalize">
              {r.replace('_', ' ')}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <Card className="divide-y divide-border">
          {data.map((u) => (
            <div key={u._id} className="flex items-center gap-3 p-4">
              <Avatar>
                <AvatarFallback>{initials(u.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.email}
                  {u.restaurantName ? ` · ${u.restaurantName}` : ''}
                </p>
              </div>
              {!u.isActive && <Badge variant="destructive">Inactive</Badge>}
              <Badge variant="outline" className="capitalize">
                {u.role.replace('_', ' ')}
              </Badge>
              <span className="hidden text-xs text-muted-foreground sm:block">{formatDate(u.createdAt)}</span>
            </div>
          ))}
        </Card>
      ) : (
        <EmptyState icon={Users} title="No users found" />
      )}
    </div>
  );
}
