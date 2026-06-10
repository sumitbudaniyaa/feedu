import { useState } from 'react';
import { LayoutGrid, Plus, Trash2 } from 'lucide-react';
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
  Select,
  Skeleton,
  Switch,
} from '@feedo/ui';
import type { SectionLayout } from '@feedo/types';
import { products as productsApi, sections as sectionsApi } from '../lib/api.js';
import { PageHeader } from '../components/PageHeader.js';

const LAYOUTS: SectionLayout[] = ['carousel', 'hero', 'grid'];

export function MenuPage() {
  const { data: sections, isLoading } = sectionsApi.useList();
  const { data: products } = productsApi.useList();
  const update = sectionsApi.useUpdate();
  const remove = sectionsApi.useRemove();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menu CMS"
        description="Build the homepage sections customers see — like Today's Best and Chef Specials."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New section
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : sections && sections.length > 0 ? (
        <div className="space-y-3">
          {sections.map((s) => (
            <Card key={s._id} className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{s.title}</p>
                  <Badge variant="outline" className="capitalize">
                    {s.layout}
                  </Badge>
                  {!s.isActive && <Badge variant="destructive">Hidden</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{s.productIds.length} products</p>
              </div>
              <Switch
                checked={s.isActive}
                onCheckedChange={(v) => update.mutate({ id: s._id, body: { isActive: v } })}
              />
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(s._id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={LayoutGrid}
          title="No sections yet"
          description="Create a section to curate products on your customer homepage."
        />
      )}

      <SectionDialog open={open} onOpenChange={setOpen} products={products ?? []} />
    </div>
  );
}

function SectionDialog({
  open,
  onOpenChange,
  products,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: { _id: string; name: string }[];
}) {
  const create = sectionsApi.useCreate();
  const [title, setTitle] = useState('');
  const [layout, setLayout] = useState<SectionLayout>('carousel');
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { title, layout, productIds: selected, isActive: true, order: 0 },
      {
        onSuccess: () => {
          onOpenChange(false);
          setTitle('');
          setSelected([]);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New section</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Today's Best" required />
          </div>
          <div className="space-y-1.5">
            <Label>Layout</Label>
            <Select value={layout} onChange={(e) => setLayout(e.target.value as SectionLayout)}>
              {LAYOUTS.map((l) => (
                <option key={l} value={l} className="capitalize">
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Products</Label>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {products.length === 0 && (
                <p className="p-2 text-sm text-muted-foreground">Add products first.</p>
              )}
              {products.map((p) => (
                <label key={p._id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary">
                  <input
                    type="checkbox"
                    checked={selected.includes(p._id)}
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
            <Button type="submit" disabled={create.isPending || !title}>
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
