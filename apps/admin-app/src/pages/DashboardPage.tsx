import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, IndianRupee, LineChart, Repeat, ShoppingBag, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, Skeleton, Tabs, TabsList, TabsTrigger, cn } from '@feedo/ui';
import { formatCurrency, formatDate, formatPercent, formatRelativeTime } from '@feedo/utils';
import { useAuth, useDashboard, useOrders } from '../lib/api.js';

const STATUS_VARIANT: Record<string, 'default' | 'accent' | 'success' | 'warning' | 'destructive'> = {
  pending: 'warning',
  confirmed: 'accent',
  preparing: 'warning',
  ready: 'success',
  served: 'default',
  completed: 'success',
  cancelled: 'destructive',
  refunded: 'destructive',
};

const RANGE_LABEL: Record<'day' | 'week' | 'month', string> = {
  day: 'today',
  week: 'this week',
  month: 'this month',
};

export function DashboardPage() {
  const user = useAuth((s) => s.user);
  const [range, setRange] = useState<'day' | 'week' | 'month'>('week');
  const { data, isLoading } = useDashboard(range);
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const recent = orders?.slice(0, 8);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s how your restaurant is performing.
          </p>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <Stat label="Revenue today" value={formatCurrency(data.revenueToday)} delta={data.revenueChangePct} icon={IndianRupee} />
            <Stat label="Orders today" value={String(data.ordersToday)} delta={data.ordersChangePct} icon={ShoppingBag} />
            <Stat label="Avg order value" value={formatCurrency(data.avgOrderValue)} icon={TrendingUp} />
            <Stat label="Repeat customers" value={`${data.repeatCustomerPct}%`} icon={Repeat} />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue {RANGE_LABEL[range]}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : data && data.revenueSeries.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.revenueSeries.map((p) => ({ ...p, label: formatDate(p.date) }))} margin={{ left: -16, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={LineChart} title="No revenue yet" description="Once orders start coming in, your revenue trend will appear here." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top sellers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)
            ) : data && data.topProducts.length > 0 ? (
              data.topProducts.map((p, i) => (
                <div key={p.productId} className="flex items-center gap-3">
                  <span className="w-4 text-xs font-medium text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sold} sold</p>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(p.revenue)}</span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No sales data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent orders</CardTitle>
          <Link to="/orders" className="text-sm font-medium text-accent hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {ordersLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : recent && recent.length > 0 ? (
            <div className="divide-y divide-border">
              {recent.map((o) => (
                <Link
                  key={o._id}
                  to="/orders"
                  className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-secondary/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">#{o.orderNumber}</span>
                      <Badge variant={STATUS_VARIANT[o.status]} className="capitalize">
                        {o.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {o.customerName ? `${o.customerName} · ` : ''}
                      {o.items.length} item{o.items.length > 1 ? 's' : ''} · {formatRelativeTime(o.placedAt)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(o.total)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8">
              <EmptyState icon={ShoppingBag} title="No orders yet" description="New orders will show up here." />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, delta, icon: Icon }: { label: string; value: string; delta?: number; icon: React.ComponentType<{ className?: string }> }) {
  const positive = (delta ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-2xl font-semibold tracking-tight">{value}</span>
          {delta !== undefined && (
            <Badge variant={positive ? 'success' : 'destructive'}>
              {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              <span className={cn('tabular-nums')}>{formatPercent(delta)}</span>
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
