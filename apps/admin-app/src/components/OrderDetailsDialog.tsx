import {
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Separator,
  cn,
} from '@feedo/ui';
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

/** Read-only order detail view, opened from order lists. */
export function OrderDetailsDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order | null;
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
                <Badge variant="outline" className="capitalize">
                  {order.type.replace('_', '-')}
                </Badge>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Meta label="Placed" value={`${formatDate(order.placedAt)} ${formatTime(order.placedAt)}`} />
              <Meta
                label="Payment"
                value={
                  <span className="capitalize">
                    {order.paymentStatus}
                    {order.paymentMethod ? ` · ${order.paymentMethod}` : ''}
                  </span>
                }
              />
              {order.customerName && <Meta label="Customer" value={order.customerName} />}
              {order.customerPhone && <Meta label="Mobile" value={order.customerPhone} />}
            </div>

            <Separator />

            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    {item.isVeg !== undefined && (
                      <span
                        className={cn(
                          'mt-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-sm border',
                          item.isVeg ? 'border-success' : 'border-destructive',
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', item.isVeg ? 'bg-success' : 'bg-destructive')} />
                      </span>
                    )}
                    <div>
                      <p className="font-medium">
                        <span className="text-accent">{item.quantity}×</span> {item.name}
                        {item.variantLabel ? ` (${item.variantLabel})` : ''}
                      </p>
                      {item.addons.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          + {item.addons.map((a) => a.label).join(', ')}
                        </p>
                      )}
                      {item.notes && <p className="text-xs italic text-muted-foreground">“{item.notes}”</p>}
                    </div>
                  </div>
                  <span className="shrink-0 font-medium">{formatCurrency(item.lineTotal)}</span>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
              {order.discountAmount > 0 && <Row label="Discount" value={`- ${formatCurrency(order.discountAmount)}`} />}
              <Row label="Tax" value={formatCurrency(order.taxAmount)} />
              <div className="flex justify-between pt-1 text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>

            {order.loyaltyPointsEarned > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                ★ {order.loyaltyPointsEarned} loyalty points earned
              </p>
            )}

            {order.notes && (
              <p className="rounded-lg bg-secondary p-3 text-sm">
                <span className="font-medium">Note: </span>
                {order.notes}
              </p>
            )}
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
      <p className="font-medium">{value}</p>
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
