import { useState } from 'react';
import { Boxes, Image as ImageIcon, Pencil, Plus, Search, Tag, Trash2, Upload } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  Input,
  Label,
  Select,
  Skeleton,
  Switch,
  Textarea,
  useConfirm,
} from '@feedo/ui';
import { formatCurrency } from '@feedo/utils';
import type { Category, Product } from '@feedo/types';
import {
  categories as categoriesApi,
  products as productsApi,
  uploadImage,
  useBranchOverrides,
  useSetBranchOverride,
} from '../lib/api.js';
import { useActiveBranchId } from '../store/branch.js';
import { PageHeader } from '../components/PageHeader.js';

export function InventoryPage() {
  const { data: products, isLoading } = productsApi.useList();
  const { data: categories } = categoriesApi.useList();
  const remove = productsApi.useRemove();
  const update = productsApi.useUpdate();
  const confirm = useConfirm();

  // null active branch = centralized (the brand catalog, applies to all branches).
  // A selected branch = per-branch overrides (availability/stock only this branch).
  const activeBranch = useActiveBranchId();
  const branchMode = Boolean(activeBranch);
  const { data: overrides } = useBranchOverrides(activeBranch);
  const setOverride = useSetBranchOverride();
  const overrideMap = new Map((overrides ?? []).map((o) => [o.productId, o]));

  /** Effective availability/stock for the current scope. */
  const eff = (p: Product) => {
    if (!branchMode) return { isAvailable: p.isAvailable, stock: p.stock };
    const o = overrideMap.get(p._id);
    return { isAvailable: o?.isAvailable ?? p.isAvailable, stock: o?.stock ?? p.stock };
  };

  const toggleAvailable = (p: Product, value: boolean) => {
    if (branchMode) setOverride.mutate({ productId: p._id, body: { isAvailable: value } });
    else update.mutate({ id: p._id, body: { isAvailable: value } });
  };

  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');
  const [status, setStatus] = useState('all'); // all | available | unavailable | low

  const filtered = (products ?? []).filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (cat !== 'all' && p.categoryId !== cat) return false;
    const e = eff(p);
    const low = e.stock != null && e.stock <= p.lowStockThreshold;
    if (status === 'available' && !e.isAvailable) return false;
    if (status === 'unavailable' && e.isAvailable) return false;
    if (status === 'low' && !low) return false;
    return true;
  });

  const deleteProduct = async (p: Product) => {
    if (await confirm({ title: `Delete ${p.name}?`, description: 'This removes the product permanently.', confirmText: 'Delete', destructive: true }))
      remove.mutate(p._id);
  };

  const catName = (id: string) => categories?.find((c) => c._id === id)?.name ?? '—';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Manage your products, pricing, stock and availability."
        action={
          <div className="flex gap-2">
            {!branchMode && <CategoryDialog categories={categories ?? []} />}
            {!branchMode && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
                disabled={!categories?.length}
              >
                <Plus className="h-4 w-4" /> Add product
              </Button>
            )}
          </div>
        }
      />

      {/* Scope banner — centralized vs a single branch. */}
      <Card className={`p-3 text-sm ${branchMode ? 'border-accent/40 bg-accent/5' : 'border-dashed'}`}>
        {branchMode ? (
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">Branch view.</span> Toggling availability or
            stock here applies <span className="font-medium">only to this branch</span>. To add or edit
            products, switch to <span className="font-medium">All branches</span> up top.
          </span>
        ) : (
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">Centralized (all branches).</span> Products,
            prices and defaults here apply to every branch — each branch can still override availability
            and stock from its own branch view.
          </span>
        )}
      </Card>

      {!categories?.length && !isLoading && !branchMode && (
        <Card className="border-dashed p-4 text-sm text-muted-foreground">
          Create a category first — products belong to a category.
        </Card>
      )}

      {/* Filters */}
      {products && products.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-44">
            <option value="all">All categories</option>
            {(categories ?? []).map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
            <option value="all">All status</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
            <option value="low">Low stock</option>
          </Select>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const e = eff(p);
            const overridden = branchMode && overrideMap.has(p._id);
            return (
            <Card key={p._id} className="group flex flex-col overflow-hidden">
              <div className="relative h-24 w-full overflow-hidden bg-secondary">
                {p.image?.url ? (
                  <img src={p.image.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-muted-foreground">
                    {p.name[0]}
                  </div>
                )}
                {!e.isAvailable && <Badge variant="destructive" className="absolute left-1.5 top-1.5">Off</Badge>}
                {e.isAvailable && e.stock != null && e.stock <= p.lowStockThreshold && (
                  <Badge variant="warning" className="absolute left-1.5 top-1.5">Low · {e.stock}</Badge>
                )}
              </div>
              <div className="flex flex-1 flex-col p-2.5">
                <p className="truncate text-sm font-medium leading-tight">{p.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{catName(p.categoryId)}</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-sm font-semibold">{formatCurrency(p.basePrice)}</span>
                  {branchMode ? (
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {overridden ? 'Branch' : 'Available'}
                      <Switch checked={e.isAvailable} onCheckedChange={(v) => toggleAvailable(p, v)} />
                    </label>
                  ) : (
                    <div className="-mr-1 flex">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="Edit"
                        onClick={() => {
                          setEditing(p);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Delete" onClick={() => deleteProduct(p)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      ) : products && products.length > 0 ? (
        <EmptyState icon={Search} title="No products match" description="Try a different search, category or status." />
      ) : (
        <EmptyState
          icon={Boxes}
          title="No products yet"
          description="Add your first menu item to start taking orders."
        />
      )}

      <ProductDialog
        open={open}
        onOpenChange={setOpen}
        product={editing}
        categories={categories ?? []}
      />
    </div>
  );
}

function ProductDialog({
  open,
  onOpenChange,
  product,
  categories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: Product | null;
  categories: Category[];
}) {
  const create = productsApi.useCreate();
  const update = productsApi.useUpdate();
  const pending = create.isPending || update.isPending;

  const [form, setForm] = useState(() => initial(product, categories));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Reset form whenever the dialog target changes.
  const key = product?._id ?? 'new';
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setForm(initial(product, categories));
    setUploadError(null);
  }

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      name: form.name,
      categoryId: form.categoryId,
      description: form.description || undefined,
      basePrice: Number(form.basePrice),
      isVeg: form.isVeg,
      isAvailable: form.isAvailable,
      stock: form.trackStock ? Number(form.stock) : null,
      image: form.imageUrl ? { url: form.imageUrl } : undefined,
      prepTimeMinutes: form.prepTime ? Number(form.prepTime) : undefined,
      loyaltyPoints: form.loyaltyPoints ? Number(form.loyaltyPoints) : undefined,
      // Keep only completed rows; drop blanks.
      variants: form.variants
        .filter((v) => v.label.trim() && v.price !== '')
        .map((v) => ({ label: v.label.trim(), price: Number(v.price) })),
      addons: form.addons
        .filter((a) => a.label.trim() && a.price !== '')
        .map((a) => ({ label: a.label.trim(), price: Number(a.price) })),
    };
    const onDone = { onSuccess: () => onOpenChange(false) };
    if (product) update.mutate({ id: product._id, body }, onDone);
    else create.mutate(body, onDone);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit product' : 'New product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex max-h-[80vh] flex-col">
          <div className="-mr-2 flex-1 space-y-4 overflow-y-auto pr-2">
          <div className="space-y-1.5">
            <Label>Product image</Label>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary">
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Uploading…' : form.imageUrl ? 'Replace' : 'Upload image'}
                  <input type="file" accept="image/*" className="hidden" onChange={onPickImage} disabled={uploading} />
                </label>
                {form.imageUrl && (
                  <button type="button" className="ml-2 text-xs text-destructive" onClick={() => setForm({ ...form, imageUrl: '' })}>
                    Remove
                  </button>
                )}
                {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
                <p className="text-xs text-muted-foreground">JPG, PNG or WebP · up to 5MB</p>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Price (₹)</Label>
              <Input type="number" min="0" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>

          {/* Sizes / variants (e.g. Half / Full). Optional — leave empty for a single size. */}
          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Sizes</p>
                <p className="text-xs text-muted-foreground">
                  Add options like Half / Full. Leave empty for a single size (uses the price above).
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setForm({ ...form, variants: [...form.variants, { label: '', price: '' }] })}
              >
                <Plus className="h-3.5 w-3.5" /> Add size
              </Button>
            </div>
            {form.variants.length > 0 && (
              <div className="space-y-2">
                {form.variants.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="Size (e.g. Half)"
                      value={v.label}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          variants: form.variants.map((row, j) =>
                            j === i ? { ...row, label: e.target.value } : row,
                          ),
                        })
                      }
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min="0"
                      placeholder="₹ Price"
                      value={v.price}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          variants: form.variants.map((row, j) =>
                            j === i ? { ...row, price: e.target.value } : row,
                          ),
                        })
                      }
                      className="w-28"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setForm({ ...form, variants: form.variants.filter((_, j) => j !== i) })}
                      aria-label="Remove size"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add-ons (e.g. Extra gravy / Cheese). Optional paid extras the diner can add. */}
          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Add-ons</p>
                <p className="text-xs text-muted-foreground">
                  Optional paid extras (e.g. Extra gravy, Cheese) the diner can add to this item.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setForm({ ...form, addons: [...form.addons, { label: '', price: '' }] })}
              >
                <Plus className="h-3.5 w-3.5" /> Add add-on
              </Button>
            </div>
            {form.addons.length > 0 && (
              <div className="space-y-2">
                {form.addons.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="Add-on (e.g. Extra gravy)"
                      value={a.label}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          addons: form.addons.map((row, j) => (j === i ? { ...row, label: e.target.value } : row)),
                        })
                      }
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min="0"
                      placeholder="₹ Price"
                      value={a.price}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          addons: form.addons.map((row, j) => (j === i ? { ...row, price: e.target.value } : row)),
                        })
                      }
                      className="w-28"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setForm({ ...form, addons: form.addons.filter((_, j) => j !== i) })}
                      aria-label="Remove add-on"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prep time (mins)</Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 15"
                value={form.prepTime}
                onChange={(e) => setForm({ ...form, prepTime: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Loyalty points / unit</Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 10"
                value={form.loyaltyPoints}
                onChange={(e) => setForm({ ...form, loyaltyPoints: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Track stock</p>
              <p className="text-xs text-muted-foreground">Decrement on each order; low-stock alerts.</p>
            </div>
            <Switch checked={form.trackStock} onCheckedChange={(v) => setForm({ ...form, trackStock: v })} />
          </div>
          {form.trackStock && (
            <div className="space-y-1.5">
              <Label>Stock quantity</Label>
              <Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
          )}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.isVeg} onCheckedChange={(v) => setForm({ ...form, isVeg: v })} /> Vegetarian
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.isAvailable} onCheckedChange={(v) => setForm({ ...form, isAvailable: v })} /> Available
            </label>
          </div>
          </div>
          {(create.error || update.error) && (
            <p className="mt-3 text-sm text-destructive">
              {(() => {
                const err = create.error ?? update.error;
                return err instanceof Error ? err.message : 'Could not save product';
              })()}
            </p>
          )}
          <DialogFooter className="mt-4 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function initial(product: Product | null, categories: Category[]) {
  return {
    name: product?.name ?? '',
    categoryId: product?.categoryId ?? categories[0]?._id ?? '',
    description: product?.description ?? '',
    basePrice: product ? String(product.basePrice) : '',
    isVeg: product?.isVeg ?? false,
    isAvailable: product?.isAvailable ?? true,
    trackStock: product?.stock != null,
    stock: product?.stock != null ? String(product.stock) : '0',
    imageUrl: product?.image?.url ?? '',
    prepTime: product?.prepTimeMinutes != null ? String(product.prepTimeMinutes) : '',
    loyaltyPoints: product?.loyaltyPoints != null ? String(product.loyaltyPoints) : '',
    // Size options, e.g. Half / Full. Empty = single-size product priced at basePrice.
    variants: (product?.variants ?? []).map((v) => ({ label: v.label, price: String(v.price) })),
    // Add-ons, e.g. Extra gravy / Cheese. Optional paid extras the diner can pick.
    addons: (product?.addons ?? []).map((a) => ({ label: a.label, price: String(a.price) })),
  };
}

function CategoryDialog({ categories }: { categories: Category[] }) {
  const create = categoriesApi.useCreate();
  const remove = categoriesApi.useRemove();
  const confirm = useConfirm();
  const [name, setName] = useState('');

  const deleteCategory = async (c: Category) => {
    if (await confirm({ title: `Delete ${c.name}?`, description: 'Products keep their category id but it will no longer resolve.', confirmText: 'Delete', destructive: true }))
      remove.mutate(c._id);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Tag className="h-4 w-4" /> Categories
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Categories</DialogTitle>
        </DialogHeader>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            create.mutate({ name: name.trim() }, { onSuccess: () => setName('') });
          }}
        >
          <Input placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" disabled={create.isPending}>
            Add
          </Button>
        </form>
        <div className="space-y-1">
          {categories.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No categories yet.</p>
          )}
          {categories.map((c) => (
            <div key={c._id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-sm">{c.name}</span>
              <Button size="icon" variant="ghost" onClick={() => deleteCategory(c)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
