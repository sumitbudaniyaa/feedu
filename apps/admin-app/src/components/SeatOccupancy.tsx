import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Armchair, CalendarPlus, CircleCheck, CircleSlash, ReceiptText } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label, Skeleton, cn } from '@feedo/ui';
import { SOCKET_EVENTS, type Table, type TableStatus } from '@feedo/types';
import { minutesSince } from '@feedo/utils';
import {
  socket,
  tables as tablesResource,
  useActiveSessions,
  useFreeTable,
  useRestaurant,
  useSeatTable,
  useUpdateTableStatus,
  type TableSession,
} from '../lib/api.js';

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

/** Compact "23m" / "1h 5m" since a session opened. */
function since(openedAt: string) {
  const m = minutesSince(openedAt);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

export function SeatOccupancy() {
  const { data: tables, isLoading } = tablesResource.useList();
  const { data: sessions } = useActiveSessions();
  const { data: restaurant } = useRestaurant();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Table | null>(null);

  // Live-sync: any seat/session/order change emits TABLE_UPDATED → refresh the grid.
  useEffect(() => {
    const rid = restaurant?._id;
    if (!rid) return;
    if (!socket.connected) socket.connect();
    socket.emit('join:restaurant', rid);
    const refresh = () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      qc.invalidateQueries({ queryKey: ['tables', 'sessions'] });
    };
    socket.on(SOCKET_EVENTS.TABLE_UPDATED, refresh);
    return () => {
      socket.off(SOCKET_EVENTS.TABLE_UPDATED, refresh);
    };
  }, [restaurant?._id, qc]);

  // A table is occupied exactly when it has a live session (joined by id — no name matching).
  const sessionByTable = new Map<string, TableSession>();
  for (const s of sessions ?? []) sessionByTable.set(String(s.tableId), s);

  const effectiveStatus = (t: Table): TableStatus => {
    if (sessionByTable.has(t._id)) return 'occupied';
    return (t.status ?? 'available') === 'reserved' ? 'reserved' : 'available';
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
              const session = sessionByTable.get(t._id);
              const billed = session?.status === 'bill_requested';
              const label = t.name.replace(/^table\s*/i, '').trim() || t.name;
              return (
                <button
                  key={t._id}
                  onClick={() => setSelected(t)}
                  title={
                    session
                      ? `${t.name} · Occupied${session.partySize ? ` (party ${session.partySize})` : ''} · ${since(session.openedAt)}${billed ? ' · bill requested' : ''}`
                      : status === 'reserved' && t.reservation?.name
                        ? `${t.name} · Reserved (${t.reservation.name})`
                        : `${t.name} · ${status}`
                  }
                  className={cn(
                    'relative flex aspect-square items-center justify-center rounded-lg border text-xs font-semibold transition-colors',
                    STATUS_STYLE[status],
                  )}
                >
                  {label}
                  {billed && (
                    <span className="absolute right-0.5 top-0.5">
                      <ReceiptText className="h-2.5 w-2.5" />
                    </span>
                  )}
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

      <SeatDialog
        table={selected}
        session={selected ? sessionByTable.get(selected._id) : undefined}
        onClose={() => setSelected(null)}
      />
    </Card>
  );
}

function SeatDialog({ table, session, onClose }: { table: Table | null; session?: TableSession; onClose: () => void }) {
  const seat = useSeatTable();
  const free = useFreeTable();
  const reserve = useUpdateTableStatus();
  const [name, setName] = useState('');
  const [partySize, setPartySize] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    setName(table?.reservation?.name ?? '');
    setPartySize(
      session?.partySize
        ? String(session.partySize)
        : table?.reservation?.partySize
          ? String(table.reservation.partySize)
          : '',
    );
    setTime(table?.reservation?.time ?? '');
  }, [table, session]);

  if (!table) return null;
  const occupied = Boolean(session);
  const reserved = !occupied && (table.status ?? 'available') === 'reserved';
  const busy = seat.isPending || free.isPending || reserve.isPending;

  const doSeat = () =>
    seat.mutate({ id: table._id, partySize: partySize ? Number(partySize) : undefined }, { onSuccess: onClose });
  const doFree = () => free.mutate({ id: table._id }, { onSuccess: onClose });
  const doReserve = () =>
    reserve.mutate(
      {
        id: table._id,
        status: 'reserved',
        reservation: {
          name: name.trim() || 'Guest',
          partySize: partySize ? Number(partySize) : undefined,
          time: time.trim() || undefined,
        },
      },
      { onSuccess: onClose },
    );

  return (
    <Dialog open={Boolean(table)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{table.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {occupied && session && (
            <div className="flex items-center justify-between rounded-xl bg-accent/10 px-3 py-2 text-sm">
              <span className="font-medium">Occupied{session.partySize ? ` · party of ${session.partySize}` : ''}</span>
              <span className="text-muted-foreground">
                {since(session.openedAt)}
                {session.openedBy === 'qr' ? ' · QR' : ''}
                {session.status === 'bill_requested' ? ' · bill ✓' : ''}
              </span>
            </div>
          )}

          {occupied ? (
            <Button variant="default" className="w-full" onClick={doFree} disabled={busy}>
              <CircleSlash className="h-4 w-4" /> Free table
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="default" size="sm" onClick={doSeat} disabled={busy}>
                <CircleCheck className="h-4 w-4" /> Seat party
              </Button>
              <Button variant={reserved ? 'default' : 'outline'} size="sm" onClick={doReserve} disabled={busy || !name.trim()}>
                <CalendarPlus className="h-4 w-4" /> {reserved ? 'Update' : 'Reserve'}
              </Button>
            </div>
          )}

          {occupied ? (
            <p className="text-center text-xs text-muted-foreground">
              Freeing the table closes this visit and unlinks it from new orders.
            </p>
          ) : (
            <div className="space-y-3 rounded-xl border border-border p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Armchair className="h-3.5 w-3.5" /> Details
              </p>
              <div className="space-y-1.5">
                <Label>Guest name (for reservations)</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul" className="h-10" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Party size</Label>
                  <Input
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    inputMode="numeric"
                    placeholder="4"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Time</Label>
                  <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="7:30 PM" className="h-10" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Tap <span className="font-medium">Seat party</span> to occupy now, or fill a name and{' '}
                <span className="font-medium">Reserve</span>. Updates live across every device.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
