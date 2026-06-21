import { forwardRef } from 'react';
import type { TrackedOrder } from '@feedo/api';
import { formatCurrency, formatDate, formatTime } from '@feedo/utils';

const PAPER = '#FBF7EF';
const INK = '#2A2520';

/** Deterministic faux-barcode bar widths derived from the order number. */
function barcode(seed: string): number[] {
  const bars: number[] = [];
  for (let i = 0; i < 40; i++) {
    const code = seed.charCodeAt(i % seed.length) + i * 7;
    bars.push((code % 3) + 1); // 1–3px
  }
  return bars;
}

const Dashed = () => <div className="my-3 border-t border-dashed" style={{ borderColor: INK }} />;

/**
 * Vintage bus-ticket style invoice. Rendered on-screen and captured to PNG
 * for download. Monospace, cream paper, perforated edges, PAID stamp, barcode.
 */
export const InvoiceTicket = forwardRef<HTMLDivElement, { order: TrackedOrder }>(
  ({ order }, ref) => {
    const r = order.restaurant;
    const paid = order.paymentStatus === 'paid';

    return (
      <div ref={ref} className="relative w-[320px]">
        <div
          className="overflow-hidden rounded-2xl px-6 py-7 font-mono text-[13px] leading-relaxed shadow-elevated"
          style={{ background: PAPER, color: INK }}
        >
          <div className="text-center">
            <p className="text-base font-bold uppercase tracking-[0.2em]">{r?.name ?? 'Feedu'}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.3em]">Tax Invoice</p>
            {r?.contactNumber && <p className="mt-1 text-[11px]">Tel · {r.contactNumber}</p>}
            {r?.gstNumber && <p className="text-[11px]">GSTIN · {r.gstNumber}</p>}
          </div>

          <Dashed />

          <Row k="Bill No" v={`#${order.orderNumber}`} />
          <Row k="Date" v={`${formatDate(order.placedAt)} ${formatTime(order.placedAt)}`} />
          <Row
            k="Type"
            v={
              order.type === 'dine_in'
                ? `Dine-in${order.tableName ? ` · ${order.tableName}` : ''}`
                : 'Takeaway'
            }
          />
          {order.customerName && <Row k="Guest" v={order.customerName} />}
          {order.customerPhone && <Row k="Mobile" v={order.customerPhone} />}

          <Dashed />

          {/* item header */}
          <div className="flex text-[11px] uppercase tracking-wider opacity-70">
            <span className="w-7">Qty</span>
            <span className="flex-1">Item</span>
            <span className="w-16 text-right">Amount</span>
          </div>
          <div className="mt-1 space-y-1">
            {order.items.map((it, i) => (
              <div key={i} className="flex items-baseline">
                <span className="w-7">{it.quantity}×</span>
                <span className="flex-1 pr-2">
                  {it.name}
                  {it.variantLabel ? ` (${it.variantLabel})` : ''}
                  {it.addons.length > 0 && (
                    <span className="block text-[11px] opacity-70">
                      + {it.addons.map((a) => a.label).join(', ')}
                    </span>
                  )}
                </span>
                <span className="w-16 text-right">{formatCurrency(it.lineTotal)}</span>
              </div>
            ))}
          </div>

          <Dashed />

          <Row k="Subtotal" v={formatCurrency(order.subtotal)} />
          {order.discountAmount > 0 && <Row k="Discount" v={`- ${formatCurrency(order.discountAmount)}`} />}
          <Row k={`GST${r?.gstPercent ? ` (${r.gstPercent}%)` : ''}`} v={formatCurrency(order.taxAmount)} />

          <div className="my-2 border-t-2 border-double" style={{ borderColor: INK }} />
          <div className="flex items-baseline justify-between text-base font-bold">
            <span>TOTAL</span>
            <span>{formatCurrency(order.total)}</span>
          </div>

          {/* PAID stamp */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider">
              {order.paymentMethod ? order.paymentMethod : 'payment'}
            </span>
            <span
              className="rounded border-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest"
              style={{
                borderColor: paid ? '#1B7F4B' : '#B4451F',
                color: paid ? '#1B7F4B' : '#B4451F',
                transform: 'rotate(-4deg)',
              }}
            >
              {paid ? 'Paid' : 'Unpaid'}
            </span>
          </div>

          {order.loyaltyPointsEarned > 0 && (
            <p className="mt-2 text-center text-[11px]">★ Earned {order.loyaltyPointsEarned} reward points ★</p>
          )}

          <Dashed />

          <p className="text-center text-[11px] uppercase tracking-[0.25em]">Thank you · visit again</p>

          {/* faux barcode */}
          <div className="mt-3 flex h-10 items-end justify-center gap-px">
            {barcode(order.orderNumber + order._id).map((w, i) => (
              <span key={i} style={{ width: w, height: '100%', background: INK }} />
            ))}
          </div>
          <p className="mt-1 text-center text-[11px] tracking-[0.3em]">{order.orderNumber}</p>
        </div>
      </div>
    );
  },
);
InvoiceTicket.displayName = 'InvoiceTicket';

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="opacity-70">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
