import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { BadgeCheck, Download } from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  Separator,
  cn,
} from '@feedo/ui';
import { formatCurrency, formatDate, formatTime } from '@feedo/utils';
import type { Order } from '@feedo/types';
import { useRecordPayment, useRestaurant } from '../lib/api.js';
import { Invoice } from './Invoice.js';

const PAY_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'upi', label: 'UPI' },
  { id: 'card', label: 'Card' },
  { id: 'zomato', label: 'Zomato' },
  { id: 'swiggy', label: 'Swiggy' },
  { id: 'district', label: 'District' },
] as const;

const CHANNEL_LABEL: Record<string, string> = {
  app: 'App',
  counter: 'Counter',
  zomato: 'Zomato',
  swiggy: 'Swiggy',
  district: 'District',
};

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
  const { data: restaurant } = useRestaurant();
  const recordPayment = useRecordPayment();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [method, setMethod] = useState<string>('cash');

  const downloadInvoice = async () => {
    if (!invoiceRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(invoiceRef.current, {
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `invoice-${order?.orderNumber ?? 'order'}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

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
                {order.channel && order.channel !== 'app' && (
                  <Badge variant="outline">{CHANNEL_LABEL[order.channel] ?? order.channel}</Badge>
                )}
                {order.isReward && <Badge variant="accent">🎁 Reward</Badge>}
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

            {/* Payment: mark unpaid orders paid with the method actually used. */}
            {order.paymentStatus === 'unpaid' ? (
              <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
                <p className="flex items-center justify-between text-sm font-medium">
                  <span>Payment pending</span>
                  <Badge variant="destructive">Unpaid</Badge>
                </p>
                <p className="text-xs text-muted-foreground">Collected the payment? Record it below.</p>
                <div className="flex gap-2">
                  <Select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="h-8 flex-1 border-0 bg-secondary text-xs shadow-none focus-visible:ring-0"
                  >
                    {PAY_METHODS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    onClick={() =>
                      recordPayment.mutate(
                        { id: order._id, method },
                        { onSuccess: () => onOpenChange(false) },
                      )
                    }
                    disabled={recordPayment.isPending}
                  >
                    {recordPayment.isPending ? 'Saving…' : 'Mark paid'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="flex items-center justify-center gap-1.5 text-sm text-success">
                <BadgeCheck className="h-4 w-4" /> Paid{order.paymentMethod ? ` · ${order.paymentMethod}` : ''}
              </p>
            )}

            <Button size="sm" variant="outline" className="w-full" onClick={downloadInvoice} disabled={downloading}>
              <Download className="h-3.5 w-3.5" /> {downloading ? 'Generating…' : 'Download invoice'}
            </Button>

            {/* Off-screen invoice used for PNG generation. */}
            <div className="pointer-events-none fixed left-[-9999px] top-0">
              <Invoice ref={invoiceRef} order={order} restaurant={restaurant} />
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
