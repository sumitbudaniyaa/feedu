/** Shared order pricing math — used by backend (authoritative) and customer cart (preview). */

export interface PriceLine {
  unitPrice: number;
  quantity: number;
}

export function lineTotal(line: PriceLine): number {
  return Math.round(line.unitPrice * line.quantity);
}

export function subtotal(lines: PriceLine[]): number {
  return lines.reduce((sum, l) => sum + lineTotal(l), 0);
}

/**
 * Compute order totals from a subtotal.
 * `inclusive` tax means the subtotal already contains tax.
 */
export function computeTotals(opts: {
  subtotal: number;
  cgstPercent: number;
  sgstPercent: number;
  inclusive?: boolean;
  discount?: number;
}): { subtotal: number; taxAmount: number; discount: number; total: number } {
  const discount = Math.min(opts.discount ?? 0, opts.subtotal);
  const taxable = opts.subtotal - discount;
  const rate = (opts.cgstPercent + opts.sgstPercent) / 100;
  const taxAmount = opts.inclusive
    ? Math.round(taxable - taxable / (1 + rate))
    : Math.round(taxable * rate);
  const total = opts.inclusive ? taxable : taxable + taxAmount;
  return { subtotal: opts.subtotal, taxAmount, discount, total };
}
