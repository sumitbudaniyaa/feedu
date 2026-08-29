import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Gift,
  Minus,
  Phone,
  Plus,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
  User,
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
import type { CartItem, Customer, LoyaltyReward, Product } from '@feedo/types';
import { categories, customers, products, rewards, tables, useCreateOrder } from '../lib/api.js';

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
  const { data: rewardList } = rewards.useList();
  const createOrder = useCreateOrder();

  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [customTable, setCustomTable] = useState<string>('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [vegOnly, setVegOnly] = useState(false);

  // Customer & Loyalty State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedReward, setSelectedReward] = useState<LoyaltyReward | null>(null);
  const [showRewardsModal, setShowRewardsModal] = useState(false);

  const cleanPhone = customerPhone.trim();
  const { data: matchedCustomers, isLoading: searchingCustomer } = customers.useList(
    { search: cleanPhone },
    { enabled: cleanPhone.length >= 3 },
  );

  const activeCustomer: Customer | undefined = useMemo(() => {
    if (!cleanPhone || !matchedCustomers) return undefined;
    return matchedCustomers.find((c) => c.phone === cleanPhone || c.phone.endsWith(cleanPhone));
  }, [cleanPhone, matchedCustomers]);

  // Available and eligible rewards for this customer
  const eligibleRewards = useMemo(() => {
    if (!rewardList) return [];
    const customerPoints = activeCustomer?.points ?? 0;
    return rewardList.filter((r) => r.isActive !== false && r.productId && customerPoints >= r.pointsCost);
  }, [rewardList, activeCustomer]);

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
  const totalCount = ticket.reduce((sum, item) => sum + item.quantity, 0) + (selectedReward ? 1 : 0);
  const subtotal = ticket.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  // Send order to kitchen
  const handleSendOrder = () => {
    if (ticket.length === 0 && !selectedReward) return;
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

    const customerPayload = cleanPhone
      ? {
          phone: cleanPhone,
          name: customerName.trim() || activeCustomer?.name || undefined,
        }
      : undefined;

    createOrder.mutate(
      {
        type: orderType,
        tableId: matchedTable?._id,
        tableName: effectiveTableName,
        items,
        notes: orderNotes.trim() || undefined,
        loyaltyRewardId: selectedReward?._id,
        customer: customerPayload,
      },
      {
        onSuccess: () => {
          const successDesc = `Order placed for ${effectiveTableName || 'counter'} (${totalCount} item${totalCount > 1 ? 's' : ''})`;
          setSuccessMessage(successDesc);
          setTicket([]);
          setSelectedReward(null);
          setOrderNotes('');
          setCustomerPhone('');
          setCustomerName('');
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
    <div className="relative space-y-4 pb-44">
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex rounded-lg bg-secondary p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setOrderType('dine_in')}
                className={cn(
                  'rounded-md px-3 py-1.5 transition-all',
                  orderType === 'dine_in'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                🍽️ Dine-in
              </button>
              <button
                type="button"
                onClick={() => setOrderType('takeaway')}
                className={cn(
                  'rounded-md px-3 py-1.5 transition-all',
                  orderType === 'takeaway'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                🥡 Takeaway
              </button>
            </div>

            {effectiveTableName && (
              <Badge variant="accent" className="font-semibold text-xs px-2.5 py-1 max-w-[160px] truncate">
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
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 touch-pan-x">
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

      {/* Customer Mobile & Loyalty Points Card */}
      <Card className="border-border/80 bg-card/80 backdrop-blur overflow-hidden">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Phone className="h-3.5 w-3.5 text-accent" /> Customer & Loyalty
            </span>
            {cleanPhone && (
              <button
                type="button"
                onClick={() => {
                  setCustomerPhone('');
                  setCustomerName('');
                  setSelectedReward(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="Mobile number (10 digits)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="h-9 pl-9 pr-3 text-xs"
              />
            </div>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={activeCustomer?.name ? `Name: ${activeCustomer.name}` : 'Customer name (optional)'}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-9 pl-9 pr-3 text-xs"
              />
            </div>
          </div>

          {/* Dynamic Customer Details Banner */}
          {cleanPhone.length >= 3 && (
            <AnimatePresence mode="wait">
              {searchingCustomer ? (
                <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                  <span className="h-2 w-2 animate-ping rounded-full bg-accent" /> Searching loyalty profile…
                </div>
              ) : activeCustomer ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-accent/30 bg-accent/10 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-xs">
                        <Star className="h-3.5 w-3.5 fill-current" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {activeCustomer.name || 'Registered Customer'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {activeCustomer.totalOrders} order{activeCustomer.totalOrders === 1 ? '' : 's'} ·{' '}
                          {activeCustomer.visits ?? 0} visit{activeCustomer.visits === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge variant="accent" className="font-extrabold text-xs px-2.5 py-1">
                        ⭐ {activeCustomer.points} Points
                      </Badge>
                    </div>
                  </div>

                  {/* Rewards eligibility */}
                  {eligibleRewards.length > 0 ? (
                    <div className="border-t border-accent/20 pt-2 flex items-center justify-between gap-2 flex-wrap">
                      <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
                        <Gift className="h-3.5 w-3.5 text-accent" />
                        {eligibleRewards.length} Reward{eligibleRewards.length > 1 ? 's' : ''} available!
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setShowRewardsModal(true)}
                        className="h-7 text-xs rounded-lg px-2.5 bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
                      >
                        {selectedReward ? 'Change Reward' : 'Redeem Reward'}
                      </Button>
                    </div>
                  ) : (
                    <p className="border-t border-accent/20 pt-2 text-[11px] text-muted-foreground">
                      💡 Customer will earn points on this order automatically upon settlement.
                    </p>
                  )}

                  {/* Active Selected Reward Tag */}
                  {selectedReward && (
                    <div className="flex items-center justify-between rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        Applied: {selectedReward.title} (-{selectedReward.pointsCost} pts)
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedReward(null)}
                        className="text-muted-foreground hover:text-destructive p-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-border bg-secondary/40 p-2.5 flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    New diner profile! They'll start earning points on this order.
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* Dish Search & Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search dishes to add..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-9 pr-9 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
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
                vegOnly
                  ? 'border-success bg-success/15 text-success'
                  : 'border-border bg-card text-muted-foreground hover:bg-secondary',
              )}
            >
              <span className="h-2 w-2 rounded-full bg-success" />
              VEG
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-1 touch-pan-x">
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
            const inTicketCount = ticket
              .filter((item) => item.productId === product._id)
              .reduce((sum, item) => sum + item.quantity, 0);

            return (
              <Card
                key={product._id}
                onClick={() => handleAddProduct(product)}
                className={cn(
                  'group flex h-full cursor-pointer flex-col justify-between overflow-hidden border transition-all active:scale-[0.98]',
                  inTicketCount > 0
                    ? 'border-foreground/50 bg-secondary/30 ring-1 ring-foreground/20'
                    : 'hover:border-border/80',
                )}
              >
                <CardContent className="p-3 flex flex-col justify-between h-full min-h-[108px] space-y-2">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <span className="line-clamp-2 text-xs font-semibold leading-tight break-words">
                        {product.name}
                      </span>
                      {product.isVeg !== undefined && (
                        <span
                          className={cn(
                            'flex h-3 w-3 shrink-0 items-center justify-center rounded-[2px] border',
                            product.isVeg ? 'border-success' : 'border-destructive',
                          )}
                        >
                          <span
                            className={cn('h-1.5 w-1.5 rounded-full', product.isVeg ? 'bg-success' : 'bg-destructive')}
                          />
                        </span>
                      )}
                    </div>
                    {hasOptions && (
                      <span className="text-[10px] text-muted-foreground block mt-0.5">Customizable</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/40 mt-auto">
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

      {/* Floating Bottom Ticket Bar — Positioned above bottom nav without overlap */}
      <AnimatePresence>
        {totalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-md px-3 pointer-events-none"
          >
            <div className="pointer-events-auto flex items-center justify-between rounded-2xl border border-border bg-card/95 p-3 shadow-elevated backdrop-blur">
              <button
                type="button"
                onClick={() => setTicketDrawerOpen(true)}
                className="flex flex-1 items-center gap-3 text-left min-w-0 pr-2"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground font-bold text-background">
                  {totalCount}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">
                    {effectiveTableName ? `Table: ${effectiveTableName}` : 'Take Order'}
                    {activeCustomer?.name ? ` · ${activeCustomer.name}` : ''}
                  </p>
                  <p className="text-sm font-extrabold text-foreground">{formatCurrency(subtotal)}</p>
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTicketDrawerOpen(true)}
                  className="h-10 rounded-xl px-3 text-xs"
                >
                  View ticket
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleSendOrder}
                  disabled={createOrder.isPending || (orderType === 'dine_in' && !effectiveTableName)}
                  className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-4 font-bold text-xs"
                >
                  <Send className={`h-3.5 w-3.5 ${createOrder.isPending ? 'animate-spin' : ''}`} />
                  {createOrder.isPending ? 'Sending…' : 'Send'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rewards Selection Modal */}
      <Dialog open={showRewardsModal} onOpenChange={setShowRewardsModal}>
        <DialogContent className="max-w-md max-h-[85dvh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Gift className="h-5 w-5 text-accent" />
              <span>Redeem Rewards for {activeCustomer?.name || 'Customer'}</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Available Balance: <strong className="text-foreground">{activeCustomer?.points ?? 0} points</strong>
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {eligibleRewards.map((r) => {
              const isSelected = selectedReward?._id === r._id;
              return (
                <div
                  key={r._id}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors',
                    isSelected ? 'border-accent bg-accent/10' : 'border-border bg-card hover:bg-secondary/40',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{r.title}</p>
                    {r.description && <p className="text-xs text-muted-foreground line-clamp-1">{r.description}</p>}
                    <span className="inline-block mt-1 text-xs font-bold text-accent">
                      {r.pointsCost} points · Free item
                    </span>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectedReward(isSelected ? null : r);
                      setShowRewardsModal(false);
                    }}
                    className={cn(
                      'shrink-0 text-xs font-bold rounded-lg',
                      isSelected && 'bg-accent text-accent-foreground',
                    )}
                  >
                    {isSelected ? 'Applied ✓' : 'Apply'}
                  </Button>
                </div>
              );
            })}
          </div>

          <DialogFooter className="p-3 border-t border-border flex items-center justify-between bg-card">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedReward(null);
                setShowRewardsModal(false);
              }}
            >
              Clear Reward
            </Button>
            <Button type="button" size="sm" onClick={() => setShowRewardsModal(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Drawer Modal */}
      <Dialog open={ticketDrawerOpen} onOpenChange={setTicketDrawerOpen}>
        <DialogContent className="max-w-md max-h-[85dvh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b border-border shrink-0">
            <DialogTitle className="flex items-center justify-between text-base">
              <span>Order Ticket ({totalCount} items)</span>
              {effectiveTableName && <Badge variant="accent">{effectiveTableName}</Badge>}
            </DialogTitle>
            {cleanPhone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                <Phone className="h-3 w-3" /> {cleanPhone}
                {activeCustomer?.name ? ` (${activeCustomer.name})` : customerName ? ` (${customerName})` : ''}
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Free Claimed Reward Line Item */}
            {selectedReward && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Gift className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-semibold text-sm truncate">{selectedReward.title}</span>
                    <Badge variant="success" className="text-[10px] px-1.5 py-0">
                      🎁 Free
                    </Badge>
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                    Loyalty Reward ({selectedReward.pointsCost} pts spent)
                  </p>
                  <p className="text-xs font-bold text-foreground mt-1">₹0</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReward(null)}
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}

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

          <DialogFooter className="p-4 border-t border-border flex-row items-center justify-between gap-3 bg-card shrink-0">
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
        <DialogContent className="max-w-md max-h-[85dvh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b border-border shrink-0">
            <DialogTitle className="text-base flex items-center justify-between">
              <span className="truncate">{customizingProduct?.name}</span>
              <span className="text-sm font-bold text-accent shrink-0 ml-2">
                {customizingProduct ? formatCurrency(customizingProduct.basePrice) : ''}
              </span>
            </DialogTitle>
          </DialogHeader>

          {customizingProduct && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                            selected
                              ? 'border-foreground/60 bg-secondary/60 font-semibold'
                              : 'border-border bg-card hover:bg-secondary/30',
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

          <DialogFooter className="p-4 border-t border-border flex-row items-center justify-end gap-2 bg-card shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setCustomizingProduct(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={confirmCustomization}
              className="bg-foreground text-background font-bold"
            >
              Add to Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
