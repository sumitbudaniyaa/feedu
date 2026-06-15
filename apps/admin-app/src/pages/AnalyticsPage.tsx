import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Clock, IndianRupee, Repeat, RefreshCw, Table2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, EmptyState, Skeleton, Tabs, TabsList, TabsTrigger } from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';
import { useDashboard } from '../lib/api.js';
import { PageHeader } from '../components/PageHeader.js';

export function AnalyticsPage() {
  const [range, setRange] = useState<'day' | 'week' | 'month'>('week');
  const { data, isLoading } = useDashboard(range);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Sales, table efficiency, peaks and top products."
        action={
          <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading || !data ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <Metric label="Total revenue" value={formatCurrency(data.revenue)} icon={IndianRupee} />
            <Metric label="Avg order value" value={formatCurrency(data.avgOrderValue)} icon={TrendingUp} />
            <Metric label="Repeat customers" value={`${data.repeatCustomerPct}%`} hint="Returning diners" icon={Repeat} />
            <Metric
              label="Revenue / table"
              value={data.tableCount ? formatCurrency(data.revenuePerTable) : '—'}
              hint={data.tableCount ? `${data.tableCount} active tables` : 'No tables set up'}
              icon={Table2}
            />
            <Metric
              label="Table turnover"
              value={data.tableCount ? `${data.tableTurnover}×` : '—'}
              hint="Parties served per table"
              icon={RefreshCw}
            />
            <Metric
              label="Avg serve time"
              value={data.avgCompletionMinutes ? `${data.avgCompletionMinutes} min` : '—'}
              hint="Order placed → completed"
              icon={Clock}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Peak hours</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : data && data.peakHours.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.peakHours.map((h) => ({ hour: `${h.hour}:00`, orders: h.orders }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="orders" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={BarChart3} title="Not enough data yet" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)
            ) : data && data.topProducts.length > 0 ? (
              data.topProducts.map((p, i) => (
                <div key={p.productId} className="flex items-center gap-3">
                  <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.sold} sold</span>
                  <span className="text-sm font-medium">{formatCurrency(p.revenue)}</span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No sales yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
