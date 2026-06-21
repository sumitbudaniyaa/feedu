import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Armchair, CalendarPlus, CircleCheck, CircleSlash } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label, Skeleton, cn } from '@feedo/ui';
import { SOCKET_EVENTS, type Table, type TableStatus } from '@feedo/types';
import { socket, tables as tablesResource, useOrders, useRestaurant, useUpdateTableStatus } from '../lib/api.js';

// Orders that mean a table is actively in use (not yet closed out).
const ACTIVE_ORDER = new Set(['pending', 'confirmed', 'preparing', 'ready', 'served']);

/** Normalise a table name for matching against an order's tableName snapshot. */
const norm = (s?: string | null) => (s ?? '').trim().toLowerCase().replace(/^table\s*/i, '');

const STATUS_STYLE: Record<TableStatus, string> = {
  available: 'border-border bg-secondary/60 text-muted-foreground hover:border-foreground/30',
  occupied: 'border-transparent bg-accent text-accent-foreground',
  reserved: 'border-warning/60 bg-warning/15 text-warning',
};

const LEGEND: Array<[TableStatus, string]> = [
  ['available', 'Free'],
  ['occupied', 'Occupied'],
  ['reserved', 'Reserved'],
];

export function SeatOccupancy() {
  const { data: tables, isLoading } = tablesResource.useList();
  const { data: orders } = useOrders();
  const { data: restaurant } = useRestaurant();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Table | null>(null);

  // Live-sync: refresh the grid whenever any device changes a table's status or an order moves.
  useEffect(() => {
    const rid = restaurant?._id;
    if (!rid) return;
    if (!socket.connected) socket.connect();
    socket.emit('join:restaurant', rid);
    const onUpdate = () => qc.invalidateQueries({ queryKey: ['tables'] });
    const onOrder = () => qc.invalidateQueries({ queryKey: ['orders'] });
    socket.on(SOCKET_EVENTS.TABLE_UPDATED, onUpdate);
    socket.on(SOCKET_EVENTS.ORDER_CREATED, onOrder);
    socket.on(SOCKET_EVENTS.ORDER_UPDATED, onOrder);
    socket.on(SOCKET_EVENTS.ORDER_STATUS_CHANGED, onOrder);
    return () => {
      socket.off(SOCKET_EVENTS.TABLE_UPDATED, onUpdate);
      socket.off(SOCKET_EVENTS.ORDER_CREATED, onOrder);
      socket.off(SOCKET_EVENTS.ORDER_UPDATED, onOrder);
      socket.off(SOCKET_EVENTS.ORDER_STATUS_CHANGED, onOrder);
    };
  }, [restaurant?._id, qc]);

  // Tables with a live order are auto-occupied (unless explicitly reserved).
  const busyTables = new Set(
    (orders ?? []).filter((o) => ACTIVE_ORDER.has(o.status) && o.tableName).map((o) => norm(o.tableName)),
  );
  const effectiveStatus = (t: Table): TableStatus => {
    const s = (t.status ?? 'available') as TableStatus;
    if (s === 'reserved') return 'reserved';
    return busyTables.has(norm(t.name)) ? 'occupied' : s;
  };

  const counts = (tables ?? []).reduce(
    (acc, t) => {
      acc[effectiveStatus(t)] += 1;
      return acc;
    },
    { available: 0, occupied: 0, reserved: 0 } as Record<TableStatus, number>,
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Seat occupancy</CardTitle>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {LEGEND.map(([s, label]) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cn('h-2.5 w-2.5 rounded-sm', STATUS_STYLE[s])} /> {label} · {counts[s]}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10 lg:grid-cols-12">
            {Array.from({ length: 24 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : tables && tables.length > 0 ? (
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10 lg:grid-cols-12">
            {tables.map((t) => {
              const status = effectiveStatus(t);
              // Compact label: drop a leading "Table " so a small cell fits "12".
              const label = t.name.replace(/^table\s*/i, '').trim() || t.name;
              const byOrder = status === 'occupied' && (t.status ?? 'available') !== 'occupied';
              return (
                <button
                  key={t._id}
                  onClick={() => setSelected(t)}
                  title={
                    status === 'reserved' && t.reservation?.name
                      ? `${t.name} · Reserved (${t.reservation.name})`
                      : byOrder
                        ? `${t.name} · Occupied (active order)`
                        : `${t.name} · ${status}`
                  }
                  className={cn(
                    'relative flex aspect-square items-center justify-center rounded-lg border text-xs font-semibold transition-colors',
                    STATUS_STYLE[status],
                  )}
                >
                  {label}
                  {byOrder && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No tables yet — add them under <span className="font-medium">Tables</span>.
          </p>
        )}
      </CardContent>

      <SeatDialog table={selected} onClose={() => setSelected(null)} />
    </Card>
  );
}

function SeatDialog({ table, onClose }: { table: Table | null; onClose: () => void }) {
  const update = useUpdateTableStatus();
  const [name, setName] = useState('');
  const [partySize, setPartySize] = useState('');
  const [time, setTime] = useState('');

  // Prefill from an existing reservation when opening.
  useEffect(() => {
    setName(table?.reservation?.name ?? '');
    setPartySize(table?.reservation?.partySize ? String(table.reservation.partySize) : '');
    setTime(table?.reservation?.time ?? '');
  }, [table]);

  if (!table) return null;
  const status = (table.status ?? 'available') as TableStatus;

  const set = (next: TableStatus) =>
    update.mutate(
      {
        id: table._id,
        status: next,
        reservation:
          next === 'reserved'
            ? { name: name.trim() || 'Guest', partySize: partySize ? Number(partySize) : undefined, time: time.trim() || undefined }
            : null,
      },
      { onSuccess: onClose },
    );

  return (
    <Dialog open={Boolean(table)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{table.name} · {table.seats ?? 2} seats</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Button variant={status === 'available' ? 'default' : 'outline'} size="sm" onClick={() => set('available')} disabled={update.isPending}>
              <CircleSlash className="h-4 w-4" /> Free
            </Button>
            <Button variant={status === 'occupied' ? 'default' : 'outline'} size="sm" onClick={() => set('occupied')} disabled={update.isPending}>
              <CircleCheck className="h-4 w-4" /> Occupied
            </Button>
            <Button variant={status === 'reserved' ? 'default' : 'outline'} size="sm" onClick={() => set('reserved')} disabled={update.isPending || !name.trim()}>
              <CalendarPlus className="h-4 w-4" /> Reserve
            </Button>
          </div>

          <div className="space-y-3 rounded-xl border border-border p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Armchair className="h-3.5 w-3.5" /> Reservation details
            </p>
            <div className="space-y-1.5">
              <Label>Guest name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul" className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Party size</Label>
                <Input value={partySize} onChange={(e) => setPartySize(e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" placeholder="4" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>Time</Label>
                <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="7:30 PM" className="h-10" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Fill the guest name, then tap <span className="font-medium">Reserve</span>. Updates live across every device.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
