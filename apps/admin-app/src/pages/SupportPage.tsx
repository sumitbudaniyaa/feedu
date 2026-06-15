import { useState } from 'react';
import { ChevronRight, LifeBuoy, Plus } from 'lucide-react';
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
  Textarea,
} from '@feedo/ui';
import { formatDate, formatTime } from '@feedo/utils';
import type { SupportTicket } from '@feedo/api';
import { useCreateTicket, useReplyTicket, useSupportTickets } from '../lib/api.js';
import { PageHeader } from '../components/PageHeader.js';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'accent' | 'default'> = {
  open: 'warning',
  in_progress: 'accent',
  resolved: 'success',
  closed: 'default',
};

export function SupportPage() {
  const { data, isLoading } = useSupportTickets();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<SupportTicket | null>(null);

  // Keep the open chat in sync with refreshed data after replying.
  const current = active ? (data?.find((t) => t._id === active._id) ?? active) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description="Raise a ticket with the Feedu team — open one to chat."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New ticket
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
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
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {t.replies.length > 0 ? `${t.replies.length} repl${t.replies.length === 1 ? 'y' : 'ies'} · ` : ''}
                  {formatDate(t.updatedAt)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </Card>
      ) : (
        <EmptyState
          icon={LifeBuoy}
          title="No tickets yet"
          description="Need help? Raise a ticket and chat with us here."
        />
      )}

      <NewTicketDialog open={open} onClose={() => setOpen(false)} />
      <ChatDialog ticket={current} onClose={() => setActive(null)} />
    </div>
  );
}

function ChatDialog({ ticket, onClose }: { ticket: SupportTicket | null; onClose: () => void }) {
  const reply = useReplyTicket();
  const [message, setMessage] = useState('');

  return (
    <Dialog open={Boolean(ticket)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        {ticket && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {ticket.subject}
                <Badge variant={STATUS_VARIANT[ticket.status]} className="capitalize">
                  {ticket.status.replace('_', ' ')}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              <Bubble side="restaurant" name="You" at={ticket.createdAt} text={ticket.message} />
              {ticket.replies.map((r, i) => (
                <Bubble
                  key={i}
                  side={r.author === 'feedo' ? 'feedo' : 'restaurant'}
                  name={r.author === 'feedo' ? 'Feedu Support' : (r.authorName ?? 'You')}
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
                reply.mutate({ id: ticket._id, message }, { onSuccess: () => setMessage('') });
              }}
            >
              <Input placeholder="Write a reply…" value={message} onChange={(e) => setMessage(e.target.value)} />
              <Button type="submit" disabled={reply.isPending || !message.trim()}>
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
  const mine = side === 'restaurant';
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

function NewTicketDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateTicket();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('other');
  const [priority, setPriority] = useState('normal');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { subject, message, category, priority },
      {
        onSuccess: () => {
          onClose();
          setSubject('');
          setMessage('');
          setCategory('other');
          setPriority('normal');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New support ticket</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="feature">Feature request</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Describe the issue</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} required />
          </div>
          {create.isError && (
            <p className="text-sm text-destructive">
              {create.error instanceof Error ? create.error.message : 'Could not raise ticket'}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || !subject || !message}>
              {create.isPending ? 'Submitting…' : 'Submit ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
