import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Boxes, IndianRupee, ReceiptText, UserRound, Users } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@feedo/ui';
import { formatCurrency, formatRelativeTime } from '@feedo/utils';
import type { Order } from '@feedo/types';
import { useRestaurantDetail } from '../lib/api.js';
import { OrderDetailsDialog } from '../components/OrderDetailsDialog.js';

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

export function RestaurantDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useRestaurantDetail(id);
  const [selected, setSelected] = useState<Order | null>(null);

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const r = data.restaurant;

  return (
    <div className="space-y-6">
      <Link to="/restaurants" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All restaurants
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-lg font-semibold">
            {r.name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{r.name}</h1>
            <p className="text-sm text-muted-foreground">/{r.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {data.subscription?.plan ?? 'no plan'}
          </Badge>
          <Badge variant={r.isLive ? 'success' : 'warning'}>{r.isLive ? 'Live' : 'Offline'}</Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue" value={formatCurrency(data.revenue)} icon={IndianRupee} />
        <Stat label="Paid orders" value={String(data.paidOrders)} icon={ReceiptText} />
        <Stat label="Products" value={String(data.productCount)} icon={Boxes} />
        <Stat label="Customers" value={String(data.customerCount)} icon={UserRound} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentOrders.length > 0 ? (
              <div className="divide-y divide-border">
                {data.recentOrders.map((o) => (
                  <button
                    key={o._id}
                    onClick={() => setSelected(o)}
                    className="flex w-full items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-secondary/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">#{o.orderNumber}</span>
                        <Badge variant={STATUS_VARIANT[o.status]} className="capitalize">
                          {o.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(o.placedAt)}</p>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(o.total)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="p-6 text-center text-sm text-muted-foreground">No orders yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Staff
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.staff.length > 0 ? (
              <div className="divide-y divide-border">
                {data.staff.map((s) => (
                  <div key={s._id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {s.role}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-6 text-center text-sm text-muted-foreground">No staff.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <OrderDetailsDialog
        order={selected}
        restaurantName={r.name}
        open={Boolean(selected)}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </div>
  );
}

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
