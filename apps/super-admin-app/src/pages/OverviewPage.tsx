import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Building2, IndianRupee, ReceiptText, TrendingUp, Users, UtensilsCrossed } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, EmptyState, Skeleton } from '@feedo/ui';
import { formatCurrency, formatDate, formatNumber } from '@feedo/utils';
import { useAnalytics, useStats } from '../lib/api.js';

export function OverviewPage() {
  const { data: stats, isLoading } = useStats();
  const { data: analytics, isLoading: aLoading } = useAnalytics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Everything happening across Feedo.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <Stat label="Gross merchandise value" value={formatCurrency(stats.gmv)} icon={IndianRupee} />
            <Stat label="Monthly recurring rev" value={formatCurrency(stats.totalMrr)} icon={TrendingUp} />
            <Stat
              label="Restaurants"
              value={`${stats.liveRestaurants}/${stats.restaurants} live`}
              icon={Building2}
            />
            <Stat label="Total orders" value={formatNumber(stats.orders)} icon={ReceiptText} />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Platform GMV — last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            {aLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : analytics && analytics.series.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={analytics.series.map((p) => ({ ...p, label: formatDate(p.date) }))}
                    margin={{ left: -16, right: 8, top: 8 }}
                  >
                    <defs>
                      <linearGradient id="gmv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => [formatCurrency(v), 'GMV']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#gmv)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={ReceiptText} title="No paid orders yet" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top restaurants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {aLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)
            ) : analytics && analytics.topRestaurants.length > 0 ? (
              analytics.topRestaurants.map((r, i) => (
                <div key={r.restaurantId} className="flex items-center gap-3">
                  <span className="w-4 text-xs font-medium text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.orders} orders</p>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(r.revenue)}</span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <MiniStat label="Customers" value={formatNumber(stats.customers)} icon={Users} />
          <MiniStat label="Active staff" value={formatNumber(stats.activeStaff)} icon={UtensilsCrossed} />
          <MiniStat
            label="Subscriptions"
            value={`${stats.activeSubscriptions} active · ${stats.trialing} trial`}
            icon={TrendingUp}
          />
        </div>
      )}

      {/* Channel mix across the platform */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {aLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)
          ) : analytics && analytics.channelMix.length > 0 ? (
            (() => {
              const total = analytics.channelMix.reduce((s, c) => s + c.revenue, 0) || 1;
              return analytics.channelMix.map((c) => (
                <div key={c.channel} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{CHANNEL_LABEL[c.channel] ?? c.channel}</span>
                    <span className="text-muted-foreground">
                      {c.orders} orders · {formatCurrency(c.revenue)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((c.revenue / total) * 100)}%` }} />
                  </div>
                </div>
              ));
            })()
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No channel data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const CHANNEL_LABEL: Record<string, string> = {
  app: 'Feedo app',
  counter: 'Counter',
  zomato: 'Zomato',
  swiggy: 'Swiggy',
  district: 'District',
};

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
