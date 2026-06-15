import {
  Avatar,
  AvatarFallback,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from '@feedo/ui';
import { Clock, Gift, ReceiptText, Sparkles, TrendingUp, Trophy } from 'lucide-react';
import { formatCurrency, formatDate, initials } from '@feedo/utils';
import type { CustomerAnalytics } from '@feedo/api';
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
      <DialogContent className="max-w-lg p-0">
        <div className="max-h-[80vh] overflow-y-auto">
          {isLoading || !data ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          ) : (
            <CustomerInsights data={data} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CustomerInsights({ data }: { data: CustomerAnalytics }) {
  const name = data.customer?.name || 'Guest';
  return (
    <>
      {/* Profile header */}
      <DialogHeader className="space-y-0 border-b border-border p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg">{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <DialogTitle className="truncate text-xl">{name}</DialogTitle>
            <p className="text-sm text-muted-foreground">{data.customer?.phone}</p>
          </div>
          <Badge variant="accent" className="ml-auto gap-1 self-start">
            <Sparkles className="h-3 w-3" /> {data.points} pts
          </Badge>
        </div>
      </DialogHeader>

      <div className="space-y-6 p-6">
        {/* Headline stats */}
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={TrendingUp} label="Total spent" value={formatCurrency(data.totalSpent)} />
          <Stat icon={ReceiptText} label="Orders" value={String(data.totalOrders)} />
          <Stat icon={TrendingUp} label="Avg order" value={formatCurrency(data.avgOrderValue)} />
        </div>

        {/* Visit insights */}
        <div className="flex flex-wrap gap-2">
          {data.firstOrderAt && <Chip icon={Clock}>First visit · {formatDate(data.firstOrderAt)}</Chip>}
          {data.lastOrderAt && <Chip icon={Clock}>Last visit · {formatDate(data.lastOrderAt)}</Chip>}
          {data.peakHour != null && <Chip icon={Clock}>Usually orders ~{data.peakHour}:00</Chip>}
          <Chip icon={Gift}>{data.rewardClaimCount} reward claim{data.rewardClaimCount === 1 ? '' : 's'}</Chip>
        </div>

        {/* Most ordered */}
        <Section icon={Trophy} title="Most ordered">
          {data.topItems.length > 0 ? (
            <div className="divide-y divide-border rounded-xl border border-border">
              {data.topItems.map((it, i) => (
                <div key={it.name} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{it.name}</span>
                  <Badge variant="outline">×{it.qty}</Badge>
                  <span className="w-16 text-right text-muted-foreground">{formatCurrency(it.spent)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty>No items ordered yet.</Empty>
          )}
        </Section>

        {/* Reward claims */}
        <Section icon={Gift} title="Reward claims">
          {data.rewardClaims.length > 0 ? (
            <div className="divide-y divide-border rounded-xl border border-border">
              {data.rewardClaims.map((o) => {
                const free = o.items.find((it) => it.lineTotal === 0) ?? o.items[0];
                return (
                  <div key={o._id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent">
                      <Gift className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{free?.name ?? 'Reward'}</span>
                    {o.rewardPointsSpent ? <Badge variant="outline">{o.rewardPointsSpent} pts</Badge> : null}
                    <span className="w-20 text-right text-muted-foreground">{formatDate(o.placedAt)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty>No reward claims yet.</Empty>
          )}
        </Section>

        {/* Recent orders */}
        <Section icon={ReceiptText} title="Recent orders">
          {data.recentOrders.length > 0 ? (
            <div className="divide-y divide-border rounded-xl border border-border">
              {data.recentOrders.map((o) => (
                <div key={o._id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
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
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="mt-2 text-lg font-semibold tabular-nums leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Chip({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
      <Icon className="h-3 w-3" /> {children}
    </span>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" /> {title}
      </p>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">{children}</p>;
}
