import { Badge, Dialog, DialogContent, DialogHeader, DialogTitle, Separator } from '@feedo/ui';
import { formatCurrency, formatDate, formatTime } from '@feedo/utils';
import type { Order } from '@feedo/types';

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

export function OrderDetailsDialog({
  order,
  restaurantName,
  open,
  onOpenChange,
}: {
  order: Order | null;
  restaurantName?: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {order && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>#{order.orderNumber}</DialogTitle>
                <Badge variant={STATUS_VARIANT[order.status]} className="capitalize">
                  {order.status}
                </Badge>
              </div>
              {restaurantName && <p className="text-sm text-muted-foreground">{restaurantName}</p>}
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Meta label="Placed" value={`${formatDate(order.placedAt)} ${formatTime(order.placedAt)}`} />
              <Meta label="Type" value={order.type.replace('_', '-')} />
              <Meta label="Payment" value={`${order.paymentStatus}${order.paymentMethod ? ` · ${order.paymentMethod}` : ''}`} />
              {order.customerName && <Meta label="Customer" value={order.customerName} />}
              {order.customerPhone && <Meta label="Mobile" value={order.customerPhone} />}
            </div>

            <Separator />

            <div className="space-y-1.5">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-baseline justify-between gap-3 text-sm">
                  <span>
                    <span className="text-accent">{item.quantity}×</span> {item.name}
                    {item.variantLabel ? ` (${item.variantLabel})` : ''}
                  </span>
                  <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
              <Row label="Tax" value={formatCurrency(order.taxAmount)} />
              <div className="flex justify-between pt-1 text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
