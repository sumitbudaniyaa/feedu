import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Minus,
  Plus,
  Search,
  Send,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Skeleton,
  cn,
} from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';
import type { CartItem, Product } from '@feedo/types';
import { categories, products, tables, useCreateOrder } from '../lib/api.js';

interface TicketItem {
  id: string; // unique key in ticket
  productId: string;
  name: string;
  basePrice: number;
  unitPrice: number;
  variantLabel?: string;
  addonLabels: string[];
  quantity: number;
  notes?: string;
  isVeg?: boolean;
}

export function WaiterOrderTaker({ onOrderCreated }: { onOrderCreated?: () => void }) {
  const { data: prods, isLoading: loadingProducts } = products.useList();
  const { data: cats, isLoading: loadingCats } = categories.useList();
  const { data: tbls, isLoading: loadingTables } = tables.useList();
  const createOrder = useCreateOrder();

  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [customTable, setCustomTable] = useState<string>('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [vegOnly, setVegOnly] = useState(false);

  // Ticket state
  const [ticket, setTicket] = useState<TicketItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [ticketDrawerOpen, setTicketDrawerOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Item customization dialog
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>();
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [itemNotes, setItemNotes] = useState('');
  const [customizingQty, setCustomizingQty] = useState(1);

  const effectiveTableName = orderType === 'takeaway' ? 'Takeaway' : customTable.trim() || selectedTable || '';

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!prods) return [];
    return prods.filter((p) => {
      const matchesCat = activeCategory === 'all' || p.categoryId === activeCategory;
      const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchesVeg = !vegOnly || p.isVeg === true;
      return matchesCat && matchesSearch && matchesVeg;
    });
  }, [prods, activeCategory, search, vegOnly]);

  const hasNonVeg = useMemo(() => {
    return (prods ?? []).some((p) => p.isVeg === false);
  }, [prods]);

  // Open customizer for product or add directly if simple
  const handleAddProduct = (product: Product) => {
    const hasOptions = (product.variants?.length ?? 0) > 0 || (product.addons?.length ?? 0) > 0;
    if (hasOptions) {
      setCustomizingProduct(product);
      setSelectedVariant(product.variants?.[0]?.label);
      setSelectedAddons([]);
      setItemNotes('');
      setCustomizingQty(1);
    } else {
      // Add simple item directly
      addItemToTicket({
        id: `${product._id}-${Date.now()}`,
        productId: product._id,
        name: product.name,
        basePrice: product.basePrice,
        unitPrice: product.basePrice,
        addonLabels: [],
        quantity: 1,
        isVeg: product.isVeg,
      });
    }
  };

  const addItemToTicket = (item: TicketItem) => {
    setTicket((prev) => {
      // Check if identical item (same product, same variant, same addons, same notes) exists
      const existingIdx = prev.findIndex(
        (p) =>
          p.productId === item.productId &&
          p.variantLabel === item.variantLabel &&
          JSON.stringify(p.addonLabels.slice().sort()) === JSON.stringify(item.addonLabels.slice().sort()) &&
          (p.notes ?? '') === (item.notes ?? ''),
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx]!,
          quantity: next[existingIdx]!.quantity + item.quantity,
        };
        return next;
      }
      return [...prev, item];
    });
  };

  const updateItemQty = (id: string, delta: number) => {
    setTicket((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is TicketItem => Boolean(item)),
    );
  };

  const removeItem = (id: string) => {
    setTicket((prev) => prev.filter((item) => item.id !== id));
  };

  // Submit customization modal
  const confirmCustomization = () => {
    if (!customizingProduct) return;
    let price = customizingProduct.basePrice;
    if (selectedVariant) {
      const v = customizingProduct.variants.find((x) => x.label === selectedVariant);
      if (v) price = v.price;
    }
    const addonTotal = selectedAddons.reduce((sum, label) => {
      const a = customizingProduct.addons.find((x) => x.label === label);
      return sum + (a?.price ?? 0);
    }, 0);

    addItemToTicket({
      id: `${customizingProduct._id}-${Date.now()}`,
      productId: customizingProduct._id,
      name: customizingProduct.name,
      basePrice: customizingProduct.basePrice,
      unitPrice: price + addonTotal,
      variantLabel: selectedVariant,
      addonLabels: selectedAddons,
      quantity: customizingQty,
      notes: itemNotes.trim() || undefined,
      isVeg: customizingProduct.isVeg,
    });
    setCustomizingProduct(null);
  };

  // Ticket totals
  const totalCount = ticket.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = ticket.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  // Send order to kitchen
  const handleSendOrder = () => {
    if (ticket.length === 0) return;
    if (orderType === 'dine_in' && !effectiveTableName) {
      alert('Please select or enter a table number for dine-in orders.');
      return;
    }

    const items: CartItem[] = ticket.map((item) => ({
      productId: item.productId,
      variantLabel: item.variantLabel,
      addonLabels: item.addonLabels,
      quantity: item.quantity,
      notes: item.notes,
    }));

    const matchedTable = tbls?.find((t) => t.name.toLowerCase() === effectiveTableName.toLowerCase());

    createOrder.mutate(
      {
        type: orderType,
        tableId: matchedTable?._id,
        tableName: effectiveTableName,
        items,
        notes: orderNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          const successDesc = `Order placed for ${effectiveTableName || 'counter'} (${totalCount} item${totalCount > 1 ? 's' : ''})`;
          setSuccessMessage(successDesc);
          setTicket([]);
          setOrderNotes('');
          setTicketDrawerOpen(false);
          if (orderType === 'takeaway') {
            setCustomTable('');
          }
          setTimeout(() => {
            setSuccessMessage(null);
            onOrderCreated?.();
          }, 2500);
        },
      },
    );
  };

  if (loadingProducts || loadingCats || loadingTables) {
    return (
      <div className="space-y-4 pb-20">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-4 pb-28">
      {/* Success notification banner */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="rounded-2xl border border-success/40 bg-success/15 p-4 text-center shadow-lg"
          >
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-success">
              <Check className="h-5 w-5" />
              <span>{successMessage}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Order has been sent directly to the kitchen display.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Type & Table Header */}
      <Card className="border-border/80 bg-card/80 backdrop-blur">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex rounded-lg bg-secondary p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setOrderType('dine_in')}
                className={cn(
                  'rounded-md px-3 py-1.5 transition-all',
                  orderType === 'dine_in' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                🍽️ Dine-in
              </button>
              <button
                type="button"
                onClick={() => setOrderType('takeaway')}
                className={cn(
                  'rounded-md px-3 py-1.5 transition-all',
                  orderType === 'takeaway' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                🥡 Takeaway
              </button>
            </div>

            {effectiveTableName && (
              <Badge variant="accent" className="font-semibold text-xs px-2.5 py-1">
                📍 {effectiveTableName}
              </Badge>
            )}
          </div>

          {orderType === 'dine_in' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Select Table:</span>
                {selectedTable && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTable('');
                      setCustomTable('');
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Quick Table Chips */}
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                {(tbls ?? []).map((t) => {
                  const isSelected = selectedTable === t.name;
                  return (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => {
                        setSelectedTable(t.name);
                        setCustomTable('');
                      }}
                      className={cn(
                        'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all',
                        isSelected
                          ? 'border-accent bg-accent text-accent-foreground shadow-sm'
                          : t.status === 'occupied'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'border-border bg-secondary/50 text-foreground hover:bg-secondary',
                      )}
                    >
                      {t.name}
                      {t.status === 'occupied' && <span className="ml-1 text-[10px] opacity-70">• Occ</span>}
                    </button>
                  );
                })}
              </div>

              {/* Or manual table input */}
              <Input
                placeholder="Or type table (e.g. Table 12, Bar 2)"
                value={customTable}
                onChange={(e) => {
                  setCustomTable(e.target.value);
                  setSelectedTable('');
                }}
                className="h-9 text-xs"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dish Search & Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search dishes to add..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-9 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {hasNonVeg && (
            <button
              type="button"
              onClick={() => setVegOnly((v) => !v)}
              className={cn(
                'flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all shrink-0',
                vegOnly ? 'border-success bg-success/15 text-success' : 'border-border bg-card text-muted-foreground hover:bg-secondary',
              )}
            >
              <span className="h-2 w-2 rounded-full bg-success" />
              VEG
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-1">
          {[{ _id: 'all', name: 'All' }, ...(cats ?? [])].map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => setActiveCategory(c._id)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                activeCategory === c._id
                  ? 'border-foreground bg-foreground text-background shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:border-foreground/30',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Item Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5">
          {filteredProducts.map((product) => {
            const hasOptions = (product.variants?.length ?? 0) > 0 || (product.addons?.length ?? 0) > 0;
            // How many of this product in current ticket
            const inTicketCount = ticket
              .filter((item) => item.productId === product._id)
              .reduce((sum, item) => sum + item.quantity, 0);

            return (
              <Card
                key={product._id}
                onClick={() => handleAddProduct(product)}
                className={cn(
                  'group flex cursor-pointer flex-col justify-between overflow-hidden border transition-all active:scale-[0.98]',
                  inTicketCount > 0 ? 'border-foreground/50 bg-secondary/30 ring-1 ring-foreground/20' : 'hover:border-border/80',
                )}
              >
                <CardContent className="p-3 flex flex-col justify-between flex-1 space-y-2">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <span className="line-clamp-2 text-xs font-semibold leading-tight">{product.name}</span>
                      {product.isVeg !== undefined && (
                        <span
                          className={cn(
                            'flex h-3 w-3 shrink-0 items-center justify-center rounded-[2px] border',
                            product.isVeg ? 'border-success' : 'border-destructive',
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', product.isVeg ? 'bg-success' : 'bg-destructive')} />
                        </span>
                      )}
                    </div>
                    {hasOptions && (
                      <span className="text-[10px] text-muted-foreground block mt-0.5">Customizable</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <span className="text-xs font-bold">{formatCurrency(product.basePrice)}</span>

                    {inTicketCount > 0 ? (
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-foreground px-1.5 text-[11px] font-bold text-background">
                        {inTicketCount}
                      </span>
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-secondary text-foreground hover:bg-foreground hover:text-background">
                        <Plus className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-sm text-muted-foreground">
          <UtensilsCrossed className="mx-auto mb-2 h-8 w-8 opacity-40" />
          No dishes found.
        </div>
      )}

      {/* Floating Bottom Ticket Bar */}
      <AnimatePresence>
        {totalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed inset-x-0 bottom-4 z-30 mx-auto max-w-md px-3"
          >
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card/95 p-3 shadow-elevated backdrop-blur">
              <button
                type="button"
                onClick={() => setTicketDrawerOpen(true)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground font-bold text-background">
                  {totalCount}
                </div>
                <div>
                  <p className="text-xs font-semibold">
                    {effectiveTableName ? `Table: ${effectiveTableName}` : 'Select table to order'}
                  </p>
                  <p className="text-sm font-extrabold text-foreground">{formatCurrency(subtotal)}</p>
                </div>
              </button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTicketDrawerOpen(true)}
                  className="h-10 rounded-xl px-3"
                >
                  View ticket
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleSendOrder}
                  disabled={createOrder.isPending || (orderType === 'dine_in' && !effectiveTableName)}
                  className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-4 font-bold"
                >
                  <Send className={`h-3.5 w-3.5 ${createOrder.isPending ? 'animate-spin' : ''}`} />
                  {createOrder.isPending ? 'Sending…' : 'Send'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ticket Drawer Modal */}
      <Dialog open={ticketDrawerOpen} onOpenChange={setTicketDrawerOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b border-border">
            <DialogTitle className="flex items-center justify-between text-base">
              <span>Order Ticket ({totalCount} items)</span>
              {effectiveTableName && <Badge variant="accent">{effectiveTableName}</Badge>}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {ticket.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/80 bg-secondary/30 p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm truncate">{item.name}</span>
                    {item.variantLabel && (
                      <span className="text-xs text-muted-foreground">({item.variantLabel})</span>
                    )}
                  </div>
                  {item.addonLabels.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">+ {item.addonLabels.join(', ')}</p>
                  )}
                  {item.notes && (
                    <p className="text-xs italic text-amber-600 dark:text-amber-400 mt-0.5">Note: {item.notes}</p>
                  )}
                  <p className="text-xs font-bold text-foreground mt-1">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateItemQty(item.id, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center text-xs font-bold tabular-nums">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateItemQty(item.id, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            <div className="space-y-1.5 pt-2">
              <Label className="text-xs">Kitchen / Order Notes (Optional)</Label>
              <Input
                placeholder="e.g. Less spicy, extra napkins, serve starters first"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border flex-row items-center justify-between gap-3 bg-card">
            <div>
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="text-lg font-black">{formatCurrency(subtotal)}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setTicketDrawerOpen(false)}>
                Add more
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSendOrder}
                disabled={createOrder.isPending || (orderType === 'dine_in' && !effectiveTableName)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
              >
                <Send className={`h-3.5 w-3.5 ${createOrder.isPending ? 'animate-spin' : ''}`} />
                {createOrder.isPending ? 'Sending…' : 'Send to Kitchen'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Customization Modal */}
      <Dialog open={Boolean(customizingProduct)} onOpenChange={(open) => !open && setCustomizingProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center justify-between">
              <span>{customizingProduct?.name}</span>
              <span className="text-sm font-bold text-accent">
                {customizingProduct ? formatCurrency(customizingProduct.basePrice) : ''}
              </span>
            </DialogTitle>
          </DialogHeader>

          {customizingProduct && (
            <div className="space-y-4 py-2">
              {/* Variants */}
              {customizingProduct.variants && customizingProduct.variants.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Choose Variant / Size</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {customizingProduct.variants.map((v) => (
                      <button
                        key={v.label}
                        type="button"
                        onClick={() => setSelectedVariant(v.label)}
                        className={cn(
                          'flex items-center justify-between rounded-xl border p-2.5 text-xs font-medium transition-all',
                          selectedVariant === v.label
                            ? 'border-foreground bg-foreground/10 text-foreground font-bold ring-1 ring-foreground'
                            : 'border-border bg-card text-muted-foreground hover:bg-secondary/50',
                        )}
                      >
                        <span>{v.label}</span>
                        <span>{formatCurrency(v.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Addons */}
              {customizingProduct.addons && customizingProduct.addons.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Add-ons</Label>
                  <div className="space-y-1.5">
                    {customizingProduct.addons.map((a) => {
                      const selected = selectedAddons.includes(a.label);
                      return (
                        <label
                          key={a.label}
                          className={cn(
                            'flex cursor-pointer items-center justify-between rounded-xl border p-2.5 text-xs transition-colors',
                            selected ? 'border-foreground/60 bg-secondary/60 font-semibold' : 'border-border bg-card hover:bg-secondary/30',
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() =>
                                setSelectedAddons((prev) =>
                                  prev.includes(a.label) ? prev.filter((x) => x !== a.label) : [...prev, a.label],
                                )
                              }
                              className="h-4 w-4"
                            />
                            {a.label}
                          </span>
                          <span className="text-muted-foreground">+{formatCurrency(a.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Item notes */}
              <div className="space-y-1.5">
                <Label className="text-xs">Item instruction</Label>
                <Input
                  placeholder="e.g. Extra spicy, no onions"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between border-t border-border/80 pt-3">
                <span className="text-xs font-semibold">Quantity</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomizingQty((q) => Math.max(1, q - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">{customizingQty}</span>
                  <button
                    type="button"
                    onClick={() => setCustomizingQty((q) => q + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setCustomizingProduct(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmCustomization} className="bg-foreground text-background">
              Add to Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
