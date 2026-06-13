import { forwardRef } from 'react';
import { formatCurrency, formatDate, formatTime } from '@feedo/utils';
import type { Order, Restaurant } from '@feedo/types';

/** Clean, business-style invoice for download/print (white A4-ish). */
export const Invoice = forwardRef<HTMLDivElement, { order: Order; restaurant?: Restaurant }>(
  ({ order, restaurant }, ref) => {
    const addr = restaurant?.address;
    return (
      <div
        ref={ref}
        className="w-[560px] bg-white p-10 text-[13px] text-neutral-800"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-200 pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              {restaurant?.name ?? 'Feedo'}
            </h1>
            {addr && (
              <p className="mt-1 max-w-[240px] text-xs text-neutral-500">
                {[addr.line1, addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ')}
              </p>
            )}
            {restaurant?.contactNumber && (
              <p className="text-xs text-neutral-500">Tel: {restaurant.contactNumber}</p>
            )}
            {restaurant?.tax?.gstNumber && (
              <p className="text-xs text-neutral-500">GSTIN: {restaurant.tax.gstNumber}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold uppercase tracking-widest text-neutral-400">Invoice</p>
            <p className="mt-1 font-mono text-sm font-semibold">#{order.orderNumber}</p>
            <p className="text-xs text-neutral-500">
              {formatDate(order.placedAt)} · {formatTime(order.placedAt)}
            </p>
          </div>
        </div>

        {/* Bill to */}
        <div className="flex justify-between py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Billed to</p>
            <p className="mt-1 font-medium">{order.customerName || 'Guest'}</p>
            {order.customerPhone && <p className="text-xs text-neutral-500">{order.customerPhone}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Details</p>
            <p className="mt-1 text-xs capitalize text-neutral-600">{order.type.replace('_', '-')}</p>
            <p className="text-xs capitalize text-neutral-600">
              Payment: {order.paymentStatus}
              {order.paymentMethod ? ` (${order.paymentMethod})` : ''}
            </p>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-y border-neutral-200 text-[10px] uppercase tracking-wider text-neutral-400">
              <th className="py-2 font-semibold">Item</th>
              <th className="py-2 text-center font-semibold">Qty</th>
              <th className="py-2 text-right font-semibold">Rate</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={i} className="border-b border-neutral-100 align-top">
                <td className="py-2.5">
                  <p className="font-medium text-neutral-800">
                    {item.name}
                    {item.variantLabel ? ` · ${item.variantLabel}` : ''}
                  </p>
                  {item.addons.length > 0 && (
                    <p className="text-xs text-neutral-400">+ {item.addons.map((a) => a.label).join(', ')}</p>
                  )}
                </td>
                <td className="py-2.5 text-center text-neutral-600">{item.quantity}</td>
                <td className="py-2.5 text-right text-neutral-600">{formatCurrency(item.unitPrice)}</td>
                <td className="py-2.5 text-right font-medium">{formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-5 flex justify-end">
          <div className="w-56 space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
            {order.discountAmount > 0 && (
              <Row label="Discount" value={`- ${formatCurrency(order.discountAmount)}`} />
            )}
            <Row
              label={`GST${restaurant?.tax?.gstPercent ? ` (${restaurant.tax.gstPercent}%)` : ''}`}
              value={formatCurrency(order.taxAmount)}
            />
            <div className="mt-1 flex justify-between border-t border-neutral-300 pt-2 text-base font-bold text-neutral-900">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        <p className="mt-10 border-t border-neutral-200 pt-4 text-center text-xs text-neutral-400">
          Thank you for your business · Powered by Feedo
        </p>
      </div>
    );
  },
);
Invoice.displayName = 'Invoice';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-neutral-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
