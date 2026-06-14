import { useState } from 'react';
import { Boxes, Image as ImageIcon, Pencil, Plus, Tag, Trash2, Upload } from 'lucide-react';
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
import { categories as categoriesApi, products as productsApi, uploadImage } from '../lib/api.js';
import { PageHeader } from '../components/PageHeader.js';

export function InventoryPage() {
  const { data: products, isLoading } = productsApi.useList();
  const { data: categories } = categoriesApi.useList();
  const remove = productsApi.useRemove();
  const confirm = useConfirm();

  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

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
            <CategoryDialog categories={categories ?? []} />
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              disabled={!categories?.length}
            >
              <Plus className="h-4 w-4" /> Add product
            </Button>
          </div>
        }
      />

      {!categories?.length && !isLoading && (
        <Card className="border-dashed p-4 text-sm text-muted-foreground">
          Create a category first — products belong to a category.
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : products && products.length > 0 ? (
        <Card className="divide-y divide-border">
          {products.map((p) => (
            <div key={p._id} className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary text-sm font-medium">
                {p.image?.url ? (
                  <img src={p.image.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  p.name[0]
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{p.name}</p>
                  {!p.isAvailable && <Badge variant="destructive">Unavailable</Badge>}
                  {p.stock != null && p.stock <= p.lowStockThreshold && (
                    <Badge variant="warning">Low stock · {p.stock}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{catName(p.categoryId)}</p>
              </div>
              <span className="text-sm font-medium">{formatCurrency(p.basePrice)}</span>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditing(p);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deleteProduct(p)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </Card>
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
    };
    const onDone = { onSuccess: () => onOpenChange(false) };
    if (product) update.mutate({ id: product._id, body }, onDone);
    else create.mutate(body, onDone);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? 'Edit product' : 'New product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
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
          <DialogFooter>
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
