import { useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { Select } from '@feedo/ui';
import { useAuth, useBranches } from '../lib/api.js';
import { getActiveBranchId, setActiveBranchId, useActiveBranchId } from '../store/branch.js';

const BRAND_WIDE = new Set(['owner', 'brand_owner', 'brand_admin']);

/** Lets brand-wide users switch the active branch (sent as x-restaurant-id). */
export function BranchSwitcher() {
  const role = useAuth((s) => s.user?.role);
  const homeBranch = useAuth((s) => s.user?.restaurantId);
  const active = useActiveBranchId();
  const { data: branches } = useBranches();
  const qc = useQueryClient();

  // Only brand-wide roles with more than one branch get a switcher.
  if (!role || !BRAND_WIDE.has(role) || !branches || branches.length < 2) return null;

  const value = active ?? homeBranch ?? branches[0]?._id;

  return (
    <div className="relative flex items-center">
      <Building2 className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground" />
      <Select
        value={value ?? ''}
        onChange={(e) => {
          setActiveBranchId(e.target.value);
          // Re-scope every cached query to the new branch.
          qc.invalidateQueries();
        }}
        className="h-9 w-44 pl-8"
      >
        {branches.map((b) => (
          <option key={b._id} value={b._id}>
            {b.name}
            {!b.isLive ? ' (offline)' : ''}
          </option>
        ))}
      </Select>
    </div>
  );
}

// Re-export so callers can read the active branch without importing the store directly.
export { getActiveBranchId };
