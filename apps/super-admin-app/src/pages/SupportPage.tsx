import { useState } from 'react';
import { ChevronRight, LifeBuoy } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  const [active, setActive] = useState<SupportTicket | null>(null);
  const current = active ? (data?.find((t) => t._id === active._id) ?? active) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support tickets</h1>
          <p className="mt-1 text-sm text-muted-foreground">Requests from your client restaurants — open one to chat.</p>
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
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <Card className="divide-y divide-border">
          {data.map((t) => (
            <button
              key={t._id}
              onClick={() => setActive(t)}
              className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{t.subject}</span>
                  <Badge variant={STATUS_VARIANT[t.status]} className="capitalize">
                    {t.status.replace('_', ' ')}
                  </Badge>
                  {t.priority === 'high' && <Badge variant="destructive">High</Badge>}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {t.restaurantName ?? 'Unknown'} · {formatDate(t.updatedAt)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </Card>
      ) : (
        <EmptyState icon={LifeBuoy} title="No tickets" description="Restaurant support requests will appear here." />
      )}

      <ChatDialog ticket={current} onClose={() => setActive(null)} />
    </div>
  );
}

function ChatDialog({ ticket, onClose }: { ticket: SupportTicket | null; onClose: () => void }) {
  const update = useUpdateTicket();
  const [message, setMessage] = useState('');

  return (
    <Dialog open={Boolean(ticket)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        {ticket && (
          <>
            <DialogHeader>
              <DialogTitle>{ticket.subject}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {ticket.restaurantName ?? 'Unknown'} · {ticket.createdByName ?? ''}
                {ticket.createdByEmail ? ` (${ticket.createdByEmail})` : ''}
              </p>
              <Select
                value={ticket.status}
                onChange={(e) => update.mutate({ id: ticket._id, body: { status: e.target.value } })}
                className="w-36"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </div>

            <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              <Bubble side="restaurant" name={ticket.createdByName ?? 'Restaurant'} at={ticket.createdAt} text={ticket.message} />
              {ticket.replies.map((r, i) => (
                <Bubble
                  key={i}
                  side={r.author === 'feedo' ? 'feedo' : 'restaurant'}
                  name={r.author === 'feedo' ? 'Feedu Support' : (r.authorName ?? 'Restaurant')}
                  at={r.createdAt}
                  text={r.message}
                />
              ))}
            </div>

            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!message.trim()) return;
                update.mutate(
                  { id: ticket._id, body: { reply: message, status: 'in_progress' } },
                  { onSuccess: () => setMessage('') },
                );
              }}
            >
              <Input placeholder="Reply to the restaurant…" value={message} onChange={(e) => setMessage(e.target.value)} />
              <Button type="submit" disabled={update.isPending || !message.trim()}>
                Send
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Bubble({ side, name, at, text }: { side: 'restaurant' | 'feedo'; name: string; at: string; text: string }) {
  const mine = side === 'feedo';
  return (
    <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-accent text-accent-foreground' : 'bg-secondary'}`}>
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
      <p className="mt-1 px-1 text-[11px] text-muted-foreground">
        {name} · {formatDate(at)} {formatTime(at)}
      </p>
    </div>
  );
}
