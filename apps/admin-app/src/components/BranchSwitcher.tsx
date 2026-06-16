import { useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { Select } from '@feedo/ui';
import { useAuth, useBranches } from '../lib/api.js';
import { getActiveBranchId, setActiveBranchId, useActiveBranchId } from '../store/branch.js';

const BRAND_WIDE = new Set(['owner', 'brand_owner', 'brand_admin']);

/**
 * Lets brand-wide users pick the active scope. Defaults to "All branches"
 * (centralized/combined) — selecting a branch scopes every tab to that branch.
 */
export function BranchSwitcher() {
  const role = useAuth((s) => s.user?.role);
  const active = useActiveBranchId();
  const { data: branches } = useBranches();
  const qc = useQueryClient();

  // Only brand-wide roles with more than one branch get a switcher.
  if (!role || !BRAND_WIDE.has(role) || !branches || branches.length < 2) return null;

  return (
    <div className="relative flex items-center">
      <Building2 className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground" />
      <Select
        value={active ?? ''}
        onChange={(e) => {
          // Empty value = All branches (centralized). Null clears the active branch.
          setActiveBranchId(e.target.value || null);
          // Re-scope every cached query to the new selection.
          qc.invalidateQueries();
        }}
        className="h-9 w-48 pl-8"
      >
        <option value="">All branches</option>
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
