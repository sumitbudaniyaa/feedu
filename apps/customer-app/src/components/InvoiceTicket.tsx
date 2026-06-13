import { forwardRef } from 'react';
import type { TrackedOrder } from '@feedo/api';
import { formatCurrency, formatDate, formatTime } from '@feedo/utils';

const PAPER = '#FFFFFF';
const INK = '#1F2430';
const MUTED = '#8A8F9C';
const PAGE = 'hsl(240 6% 97%)'; // matches customer app page background

/** Deterministic faux-barcode bar widths derived from the order id. */
function barcode(seed: string): number[] {
  const bars: number[] = [];
  for (let i = 0; i < 52; i++) {
    const code = seed.charCodeAt(i % seed.length) + i * 7;
    bars.push((code % 3) + 1);
  }
  return bars;
}

/**
 * Clean modern receipt — brand-accent header band, monospace body, tidy rows
 * and a barcode. Rendered on-screen and captured to PNG for download.
 */
export const InvoiceTicket = forwardRef<HTMLDivElement, { order: TrackedOrder }>(
  ({ order }, ref) => {
    const r = order.restaurant;
    const paid = order.paymentStatus === 'paid';

    return (
      <div ref={ref} style={{ background: PAGE, padding: 16 }}>
        <div
          className="mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl"
          style={{ background: PAPER, boxShadow: '0 10px 30px rgba(0,0,0,0.10)' }}
        >
          {/* Accent header */}
          <div
            className="px-6 py-6 text-center text-white"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent) / 0.8))',
            }}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/20 text-lg font-bold ring-1 ring-white/30">
              {(r?.name ?? 'F')[0]}
            </div>
            <p className="mt-3 text-base font-bold tracking-tight">{r?.name ?? 'Feedo'}</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.3em] text-white/85">
              Tax Invoice
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-5 font-mono text-[12.5px] leading-relaxed" style={{ color: INK }}>
            {(r?.contactNumber || r?.gstNumber) && (
              <div className="mb-3 text-center text-[10.5px]" style={{ color: MUTED }}>
                {r?.contactNumber && <span>Tel {r.contactNumber}</span>}
                {r?.contactNumber && r?.gstNumber && <span> · </span>}
                {r?.gstNumber && <span>GSTIN {r.gstNumber}</span>}
              </div>
            )}

            <div className="space-y-1">
              <Row k="Bill No" v={`#${order.orderNumber}`} />
              <Row k="Date" v={`${formatDate(order.placedAt)} · ${formatTime(order.placedAt)}`} />
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
            </div>

            <Perf />

            {/* Items */}
            <div className="space-y-2">
              {order.items.map((it, i) => (
                <div key={i} className="flex items-baseline gap-2">
                  <span className="font-semibold" style={{ color: 'hsl(var(--accent))' }}>
                    {it.quantity}×
                  </span>
                  <span className="flex-1">
                    {it.name}
                    {it.variantLabel ? (
                      <span style={{ color: MUTED }}> · {it.variantLabel}</span>
                    ) : null}
                    {it.addons.length > 0 && (
                      <span className="block text-[10.5px]" style={{ color: MUTED }}>
                        + {it.addons.map((a) => a.label).join(', ')}
                      </span>
                    )}
                  </span>
                  <span className="font-medium">{formatCurrency(it.lineTotal)}</span>
                </div>
              ))}
            </div>

            <Perf />

            <div className="space-y-1">
              <Row k="Subtotal" v={formatCurrency(order.subtotal)} muted />
              {order.discountAmount > 0 && (
                <Row k="Discount" v={`- ${formatCurrency(order.discountAmount)}`} muted />
              )}
              <Row
                k={`GST${r?.gstPercent ? ` (${r.gstPercent}%)` : ''}`}
                v={formatCurrency(order.taxAmount)}
                muted
              />
            </div>

            {/* Total */}
            <div
              className="mt-3 flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: 'hsl(var(--accent) / 0.08)' }}
            >
              <span className="text-sm font-bold">TOTAL</span>
              <span className="text-base font-bold" style={{ color: 'hsl(var(--accent))' }}>
                {formatCurrency(order.total)}
              </span>
            </div>

            {/* Payment row */}
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="uppercase tracking-wider" style={{ color: MUTED }}>
                {order.paymentMethod ?? 'Payment'}
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                style={{
                  background: paid ? 'rgba(27,127,75,0.12)' : 'rgba(180,69,31,0.12)',
                  color: paid ? '#1B7F4B' : '#B4451F',
                }}
              >
                {paid ? 'Paid' : 'Unpaid'}
              </span>
            </div>

            {order.loyaltyPointsEarned > 0 && (
              <p className="mt-3 text-center text-[11px]" style={{ color: 'hsl(var(--accent))' }}>
                ★ Earned {order.loyaltyPointsEarned} reward points
              </p>
            )}

            {/* Barcode */}
            <div className="mt-5 flex h-9 items-end justify-center gap-px">
              {barcode(order.orderNumber + order._id).map((w, i) => (
                <span key={i} style={{ width: w, height: '100%', background: INK }} />
              ))}
            </div>
            <p className="mt-1.5 text-center text-[10px] tracking-[0.35em]" style={{ color: MUTED }}>
              {order.orderNumber}
            </p>
            <p className="mt-3 text-center text-[10px] uppercase tracking-[0.25em]" style={{ color: MUTED }}>
              Thank you · visit again
            </p>
          </div>
        </div>
      </div>
    );
  },
);
InvoiceTicket.displayName = 'InvoiceTicket';

/** Clean dashed perforation divider. */
function Perf() {
  return <div className="my-3 border-t border-dashed" style={{ borderColor: '#DEE0E6' }} />;
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span style={{ color: MUTED }}>{k}</span>
      <span className="text-right" style={{ color: muted ? MUTED : INK }}>
        {v}
      </span>
    </div>
  );
}
