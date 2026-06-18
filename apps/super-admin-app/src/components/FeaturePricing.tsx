import { useEffect, useMemo, useState } from 'react';
import { Input, Label, Select, Switch } from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';
import { computeSubscriptionPrice } from '@feedo/utils';
import { FEATURE_CATALOG, FEATURE_GROUPS, LIMIT_KEYS } from '@feedo/types';

type Cycle = 'monthly' | 'quarterly' | 'yearly';

export interface FeaturePricingValue {
  basePrice: number;
  billingCycle: Cycle;
  features: { key: string; price: number }[];
  limits: Record<string, number>;
  finalPrice: number;
  mrr: number;
}

const GROUP_LABEL: Record<string, string> = {
  core: 'Core',
  operations: 'Operations',
  analytics: 'Analytics',
  loyalty: 'Loyalty',
  payments: 'Payments',
  branding: 'Branding',
  enterprise: 'Enterprise',
  future: 'Future',
};

const LIMIT_LABEL: Record<string, string> = {
  max_branches: 'Max branches',
  max_staff: 'Max staff',
  max_tables: 'Max tables',
  max_products: 'Max products',
  max_orders_monthly: 'Max orders / month',
  max_loyalty_rewards: 'Max rewards',
  max_storage: 'Max storage (MB)',
};

/**
 * Feature picker + limits + live dynamic pricing. Lifts the computed payload via
 * `onChange` (pass a stable setter). Used in onboarding and brand feature mgmt.
 */
export function FeaturePricing({
  branchCount,
  onChange,
  initial,
}: {
  branchCount: number;
  onChange: (v: FeaturePricingValue) => void;
  initial?: { enabled?: string[]; prices?: Record<string, number>; basePrice?: number; billingCycle?: Cycle; limits?: Record<string, number> };
}) {
  const [basePrice, setBasePrice] = useState(String(initial?.basePrice ?? 0));
  const [billingCycle, setBillingCycle] = useState<Cycle>(initial?.billingCycle ?? 'monthly');
  const [sel, setSel] = useState<Record<string, { on: boolean; price: number }>>(() =>
    Object.fromEntries(
      FEATURE_CATALOG.map((f) => [
        f.key,
        {
          on: f.core || (initial?.enabled?.includes(f.key) ?? false),
          price: initial?.prices?.[f.key] ?? f.defaultPrice,
        },
      ]),
    ),
  );
  const [limits, setLimits] = useState<Record<string, string>>(() =>
    Object.fromEntries(LIMIT_KEYS.map((k) => [k, initial?.limits?.[k] != null ? String(initial!.limits![k]) : ''])),
  );

  const featureCharges = useMemo(
    () => FEATURE_CATALOG.filter((f) => sel[f.key]?.on).map((f) => ({ key: f.key, price: sel[f.key]!.price })),
    [sel],
  );
  const pricing = useMemo(
    () =>
      computeSubscriptionPrice({
        basePrice: Number(basePrice) || 0,
        featureCharges,
        branchCount,
        billingCycle,
      }),
    [basePrice, featureCharges, branchCount, billingCycle],
  );

  const numericLimits = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(limits)) if (v !== '' && Number(v) >= 0) out[k] = Number(v);
    return out;
  }, [limits]);

  useEffect(() => {
    onChange({ basePrice: Number(basePrice) || 0, billingCycle, features: featureCharges, limits: numericLimits, finalPrice: pricing.finalPrice, mrr: pricing.mrr });
  }, [basePrice, billingCycle, featureCharges, numericLimits, pricing.finalPrice, pricing.mrr, onChange]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Base fee (₹)</Label>
          <Input type="number" min="0" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Billing cycle</Label>
          <Select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as Cycle)}>
            <option value="monthly">monthly</option>
            <option value="quarterly">quarterly</option>
            <option value="yearly">yearly</option>
          </Select>
        </div>
      </div>

      {/* Feature catalog grouped */}
      <div className="space-y-3 rounded-lg border border-border p-3">
        <Label>Features</Label>
        {FEATURE_GROUPS.map((group) => {
          const items = FEATURE_CATALOG.filter((f) => f.group === group);
          if (!items.length) return null;
          return (
            <div key={group} className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{GROUP_LABEL[group]}</p>
              {items.map((f) => (
                <div key={f.key} className="flex items-center gap-2">
                  <Switch
                    checked={sel[f.key]?.on ?? false}
                    disabled={f.core}
                    onCheckedChange={(v) => setSel((s) => ({ ...s, [f.key]: { ...s[f.key]!, on: v } }))}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {f.label}
                    {f.core && <span className="ml-1 text-[10px] text-muted-foreground">(included)</span>}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      min="0"
                      value={String(sel[f.key]?.price ?? 0)}
                      disabled={!sel[f.key]?.on || f.core}
                      onChange={(e) => setSel((s) => ({ ...s, [f.key]: { ...s[f.key]!, price: Number(e.target.value) || 0 } }))}
                      className="h-8 w-20"
                    />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Limits */}
      <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium">Usage limits (optional)</summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {LIMIT_KEYS.map((k) => (
            <div key={k} className="space-y-1.5">
              <Label>{LIMIT_LABEL[k]}</Label>
              <Input
                type="number"
                min="0"
                placeholder="∞"
                value={limits[k] ?? ''}
                onChange={(e) => setLimits((l) => ({ ...l, [k]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </details>

      <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5">
        <span className="text-sm text-muted-foreground">Total / {billingCycle}</span>
        <span className="text-lg font-semibold">{formatCurrency(pricing.finalPrice)}</span>
      </div>
    </div>
  );
}
