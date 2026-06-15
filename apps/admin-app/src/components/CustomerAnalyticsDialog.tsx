import {
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from '@feedo/ui';
import { formatCurrency, formatDate } from '@feedo/utils';
import { useCustomerAnalytics } from '../lib/api.js';

/** Per-diner analytics: spend, favourites, reward claims, recent orders. */
export function CustomerAnalyticsDialog({
  customerId,
  open,
  onOpenChange,
}: {
  customerId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data, isLoading } = useCustomerAnalytics(open ? (customerId ?? undefined) : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{data?.customer?.name || 'Diner'} · insights</DialogTitle>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : (
          <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
            <p className="text-sm text-muted-foreground">{data.customer?.phone}</p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Spent" value={formatCurrency(data.totalSpent)} />
              <Metric label="Orders" value={String(data.totalOrders)} />
              <Metric label="Avg order" value={formatCurrency(data.avgOrderValue)} />
              <Metric label="Points" value={String(data.points)} />
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {data.firstOrderAt && <Chip>First visit {formatDate(data.firstOrderAt)}</Chip>}
              {data.lastOrderAt && <Chip>Last visit {formatDate(data.lastOrderAt)}</Chip>}
              {data.peakHour != null && <Chip>Usually orders ~{data.peakHour}:00</Chip>}
              <Chip>{data.rewardClaimCount} reward claim{data.rewardClaimCount === 1 ? '' : 's'}</Chip>
            </div>

            {/* Most ordered */}
            <Section title="Most ordered">
              {data.topItems.length > 0 ? (
                <div className="space-y-2">
                  {data.topItems.map((it, i) => (
                    <div key={it.name} className="flex items-center gap-3 text-sm">
                      <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{it.name}</span>
                      <span className="text-xs text-muted-foreground">×{it.qty}</span>
                      <span className="w-16 text-right">{formatCurrency(it.spent)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty>No items yet.</Empty>
              )}
            </Section>

            {/* Reward claims */}
            <Section title="Reward claims">
              {data.rewardClaims.length > 0 ? (
                <div className="space-y-2">
                  {data.rewardClaims.map((o) => {
                    const free = o.items.find((it) => it.lineTotal === 0) ?? o.items[0];
                    return (
                      <div key={o._id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 flex-1 truncate">🎁 {free?.name ?? 'Reward'}</span>
                        <span className="text-xs text-muted-foreground">
                          {o.rewardPointsSpent ? `${o.rewardPointsSpent} pts · ` : ''}
                          {formatDate(o.placedAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty>No reward claims yet.</Empty>
              )}
            </Section>

            {/* Recent orders */}
            <Section title="Recent orders">
              {data.recentOrders.length > 0 ? (
                <div className="space-y-2">
                  {data.recentOrders.map((o) => (
                    <div key={o._id} className="flex items-center gap-3 text-sm">
                      <span className="font-medium">#{o.orderNumber}</span>
                      <Badge variant="outline" className="capitalize">
                        {o.status}
                      </Badge>
                      <span className="ml-auto text-xs text-muted-foreground">{formatDate(o.placedAt)}</span>
                      <span className="w-16 text-right font-medium">{formatCurrency(o.total)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty>No orders yet.</Empty>
              )}
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-secondary px-2.5 py-1">{children}</span>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{title}</p>
      {children}
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
