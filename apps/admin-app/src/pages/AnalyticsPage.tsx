import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Store } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, Skeleton, Tabs, TabsList, TabsTrigger } from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';
import { useDashboard } from '../lib/api.js';
import { PageHeader } from '../components/PageHeader.js';

const CHANNEL_LABEL: Record<string, string> = {
  app: 'Feedo app',
  counter: 'Counter',
  zomato: 'Zomato',
  swiggy: 'Swiggy',
  district: 'District',
};

export function AnalyticsPage() {
  const [range, setRange] = useState<'day' | 'week' | 'month'>('week');
  const { data, isLoading } = useDashboard(range);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Understand your peaks, top products and customer behaviour."
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

      {/* Order channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="h-4 w-4" /> Order channels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)
          ) : data && data.channelMix.length > 0 ? (
            (() => {
              const totalRev = data.channelMix.reduce((s, c) => s + c.revenue, 0) || 1;
              return data.channelMix.map((c) => {
                const pctShare = Math.round((c.revenue / totalRev) * 100);
                return (
                  <div key={c.channel} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        {CHANNEL_LABEL[c.channel] ?? c.channel}
                        <Badge variant="outline">{c.orders} orders</Badge>
                      </span>
                      <span className="font-medium">{formatCurrency(c.revenue)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pctShare}%` }} />
                    </div>
                  </div>
                );
              });
            })()
          ) : (
            <EmptyState icon={Store} title="No channel data yet" description="Orders from the app, counter, Zomato or Swiggy will break down here." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
