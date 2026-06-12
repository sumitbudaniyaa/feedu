import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  GalleryHorizontal,
  Grid3x3,
  LayoutGrid,
  Pencil,
  Plus,
  RectangleHorizontal,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Skeleton,
  Switch,
  cn,
} from '@feedo/ui';
import type { Product, Section, SectionLayout } from '@feedo/types';
import { apiClient, products as productsApi, sections as sectionsApi } from '../lib/api.js';
import { PageHeader } from '../components/PageHeader.js';

const LAYOUTS: { value: SectionLayout; label: string; hint: string; icon: typeof Grid3x3 }[] = [
  { value: 'carousel', label: 'Carousel', hint: 'Swipeable row', icon: GalleryHorizontal },
  { value: 'hero', label: 'Hero', hint: 'Big feature card', icon: RectangleHorizontal },
  { value: 'grid', label: 'Grid', hint: '2-column tiles', icon: Grid3x3 },
];

export function MenuPage() {
  const { data: sections, isLoading } = sectionsApi.useList();
  const { data: products } = productsApi.useList();
  const update = sectionsApi.useUpdate();
  const remove = sectionsApi.useRemove();
  const qc = useQueryClient();

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => apiClient.patch('/sections/reorder', { orderedIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sections'] }),
  });

  const [editing, setEditing] = useState<Section | null>(null);
  const [open, setOpen] = useState(false);

  const move = (index: number, dir: -1 | 1) => {
    if (!sections) return;
    const ids = sections.map((s) => s._id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target]!, next[index]!];
    reorder.mutate(next);
  };

  const productById = new Map((products ?? []).map((p) => [p._id, p]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menu CMS"
        description="Curate the sections diners see at the top of your menu — they appear live in the customer app."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New section
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : sections && sections.length > 0 ? (
        <div className="space-y-3">
          {sections.map((s, i) => {
            const layout = LAYOUTS.find((l) => l.value === s.layout);
            const LayoutIcon = layout?.icon ?? Grid3x3;
            const items = s.productIds
              .map((id) => productById.get(id))
              .filter((p): p is Product => Boolean(p));
            return (
              <motion.div key={s._id} layout transition={{ duration: 0.2 }}>
                <Card className={cn('p-4', !s.isActive && 'opacity-60')}>
                  <div className="flex items-start gap-4">
                    {/* Reorder controls */}
                    <div className="flex flex-col gap-1 pt-0.5">
                      <button
                        onClick={() => move(i, -1)}
                        disabled={i === 0 || reorder.isPending}
                        className="rounded-md border border-border p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === sections.length - 1 || reorder.isPending}
                        className="rounded-md border border-border p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{s.title}</p>
                        <Badge variant="outline" className="gap-1">
                          <LayoutIcon className="h-3 w-3" /> {layout?.label}
                        </Badge>
                        {!s.isActive && <Badge variant="destructive">Hidden</Badge>}
                      </div>
                      {s.subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{s.subtitle}</p>}

                      {/* Product chips */}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {items.slice(0, 5).map((p) => (
                          <span
                            key={p._id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 py-0.5 pl-0.5 pr-2.5 text-xs"
                          >
                            <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-secondary text-[10px] font-semibold">
                              {p.image?.url ? (
                                <img src={p.image.url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                p.name[0]
                              )}
                            </span>
                            {p.name}
                          </span>
                        ))}
                        {items.length > 5 && (
                          <span className="text-xs text-muted-foreground">+{items.length - 5} more</span>
                        )}
                        {items.length === 0 && (
                          <span className="text-xs text-warning">No products — section won&apos;t render</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={s.isActive}
                        onCheckedChange={(v) => update.mutate({ id: s._id, body: { isActive: v } })}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(s);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove.mutate(s._id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={LayoutGrid}
          title="No sections yet"
          description='Create one like "Today&apos;s Best" — it shows at the top of your customer menu.'
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Create your first section
            </Button>
          }
        />
      )}

      <SectionDialog open={open} onOpenChange={setOpen} section={editing} products={products ?? []} />
    </div>
  );
}

function SectionDialog({
  open,
  onOpenChange,
  section,
  products,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  section: Section | null;
  products: Product[];
}) {
  const create = sectionsApi.useCreate();
  const update = sectionsApi.useUpdate();
  const pending = create.isPending || update.isPending;

  const [form, setForm] = useState(() => initial(section));
  const key = section?._id ?? 'new';
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setForm(initial(section));
  }

  const toggle = (id: string) =>
    setForm((f) => ({
      ...f,
      productIds: f.productIds.includes(id)
        ? f.productIds.filter((x) => x !== id)
        : [...f.productIds, id],
    }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      title: form.title,
      subtitle: form.subtitle || undefined,
      layout: form.layout,
      productIds: form.productIds,
      isActive: true,
    };
    const onDone = { onSuccess: () => onOpenChange(false) };
    if (section) update.mutate({ id: section._id, body }, onDone);
    else create.mutate({ ...body, order: 999 }, onDone);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{section ? 'Edit section' : 'New section'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Today's Best"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Subtitle (optional)</Label>
              <Input
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="Loved by regulars"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Layout</Label>
            <div className="grid grid-cols-3 gap-2">
              {LAYOUTS.map((l) => {
                const Icon = l.icon;
                const active = form.layout === l.value;
                return (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setForm({ ...form, layout: l.value })}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition-colors',
                      active
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border text-muted-foreground hover:bg-secondary',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{l.label}</span>
                    <span className="text-[10px] opacity-70">{l.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Products <span className="text-muted-foreground">({form.productIds.length} selected)</span>
            </Label>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {products.length === 0 && (
                <p className="p-2 text-sm text-muted-foreground">Add products in Inventory first.</p>
              )}
              {products.map((p) => (
                <label
                  key={p._id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
                >
                  <input
                    type="checkbox"
                    checked={form.productIds.includes(p._id)}
                    onChange={() => toggle(p._id)}
                    className="accent-[hsl(var(--accent))]"
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !form.title || form.productIds.length === 0}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function initial(section: Section | null) {
  return {
    title: section?.title ?? '',
    subtitle: section?.subtitle ?? '',
    layout: (section?.layout ?? 'carousel') as SectionLayout,
    productIds: section?.productIds ?? [],
  };
}
