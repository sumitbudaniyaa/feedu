import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, QrCode, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Skeleton,
  useConfirm,
} from '@feedo/ui';
import type { Table } from '@feedo/types';
import { apiClient, tables as tablesApi } from '../lib/api.js';
import { PageHeader } from '../components/PageHeader.js';

const CUSTOMER_URL = import.meta.env.VITE_CUSTOMER_URL ?? 'http://localhost:5174';

function qrImage(qrToken: string, size = 240) {
  const target = `${CUSTOMER_URL}/t/${qrToken}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(target)}`;
}

export function TablesPage() {
  const { data: tables, isLoading } = tablesApi.useList();
  const remove = tablesApi.useRemove();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [count, setCount] = useState('5');
  const [qrTable, setQrTable] = useState<Table | null>(null);

  const create = tablesApi.useCreate();
  const generate = useMutation({
    mutationFn: (n: number) => apiClient.post('/tables/generate', { count: n, prefix: 'Table' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tables'] }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Tables & QR" description="Generate a unique QR per table for instant ordering." />

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            create.mutate({ name: name.trim() }, { onSuccess: () => setName('') });
          }}
        >
          <div className="space-y-1.5">
            <Label>Add a single table</Label>
            <Input placeholder="Patio 1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button type="submit" disabled={create.isPending}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </form>
        <div className="ml-auto flex items-end gap-2">
          <div className="space-y-1.5">
            <Label>Bulk generate</Label>
            <Input type="number" min="1" max="200" className="w-24" value={count} onChange={(e) => setCount(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => generate.mutate(Number(count))} disabled={generate.isPending}>
            Generate {count}
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : tables && tables.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((t) => (
            <Card key={t._id} className="flex items-center gap-3 p-4">
              <button
                onClick={() => setQrTable(t)}
                className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary transition-colors hover:bg-accent/15"
              >
                <QrCode className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.name}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={async () => {
                  if (await confirm({ title: `Delete ${t.name}?`, description: 'Its QR code will stop working.', confirmText: 'Delete', destructive: true }))
                    remove.mutate(t._id);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={QrCode} title="No tables yet" description="Add tables to generate their QR codes." />
      )}

      <Dialog open={Boolean(qrTable)} onOpenChange={(v) => !v && setQrTable(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{qrTable?.name}</DialogTitle>
          </DialogHeader>
          {qrTable && (
            <div className="flex flex-col items-center gap-4">
              <img src={qrImage(qrTable.qrToken)} alt={`QR for ${qrTable.name}`} className="rounded-xl bg-white p-2" width={240} height={240} />
              <Button asChild variant="outline" className="w-full">
                <a href={qrImage(qrTable.qrToken, 600)} download={`${qrTable.name}-qr.png`} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4" /> Download
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
