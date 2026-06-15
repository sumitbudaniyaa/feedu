import { useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Skeleton,
} from '@feedo/ui';
import { formatDate, formatTime } from '@feedo/utils';
import type { SupportTicket } from '@feedo/api';
import { useSupportTickets, useUpdateTicket } from '../lib/api.js';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'accent' | 'default'> = {
  open: 'warning',
  in_progress: 'accent',
  resolved: 'success',
  closed: 'default',
};
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;

export function SupportPage() {
  const [filter, setFilter] = useState('');
  const { data, isLoading } = useSupportTickets(filter || undefined);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support tickets</h1>
          <p className="mt-1 text-sm text-muted-foreground">Requests raised by restaurants.</p>
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-44">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s.replace('_', ' ')}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((t) => (
            <TicketCard key={t._id} ticket={t} />
          ))}
        </div>
      ) : (
        <EmptyState icon={LifeBuoy} title="No tickets" description="Restaurant support requests will appear here." />
      )}
    </div>
  );
}

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const update = useUpdateTicket();
  const [reply, setReply] = useState('');

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{ticket.subject}</span>
            <Badge variant={STATUS_VARIANT[ticket.status]} className="capitalize">
              {ticket.status.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {ticket.category}
            </Badge>
            {ticket.priority === 'high' && <Badge variant="destructive">High</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {ticket.restaurantName ?? 'Unknown'} · {ticket.createdByName ?? ''}
            {ticket.createdByEmail ? ` (${ticket.createdByEmail})` : ''} · {formatDate(ticket.createdAt)}{' '}
            {formatTime(ticket.createdAt)}
          </p>
        </div>
        <Select
          value={ticket.status}
          onChange={(e) => update.mutate({ id: ticket._id, body: { status: e.target.value } })}
          className="w-40"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s.replace('_', ' ')}
            </option>
          ))}
        </Select>
      </div>

      <p className="mt-3 whitespace-pre-wrap rounded-lg bg-secondary/60 p-3 text-sm">{ticket.message}</p>

      {ticket.replies.length > 0 && (
        <div className="mt-3 space-y-2">
          {ticket.replies.map((r, i) => (
            <div
              key={i}
              className={`rounded-lg p-2.5 text-sm ${r.author === 'feedo' ? 'bg-accent/10' : 'bg-secondary/40'}`}
            >
              <p className="text-xs font-medium text-muted-foreground">
                {r.author === 'feedo' ? 'Feedo Support' : (r.authorName ?? 'Restaurant')} ·{' '}
                {formatDate(r.createdAt)}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap">{r.message}</p>
            </div>
          ))}
        </div>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!reply.trim()) return;
          update.mutate(
            { id: ticket._id, body: { reply, status: 'in_progress' } },
            { onSuccess: () => setReply('') },
          );
        }}
      >
        <Input placeholder="Reply to this ticket…" value={reply} onChange={(e) => setReply(e.target.value)} />
        <Button type="submit" disabled={update.isPending || !reply.trim()}>
          Send
        </Button>
      </form>
    </Card>
  );
}
