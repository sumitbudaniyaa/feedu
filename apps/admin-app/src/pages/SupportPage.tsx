import { useState } from 'react';
import { LifeBuoy, Plus } from 'lucide-react';
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
import { useCreateTicket, useSupportTickets } from '../lib/api.js';
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description="Raise a ticket with the Feedo team — we'll get back to you here."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New ticket
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((t) => (
            <TicketCard key={t._id} ticket={t} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={LifeBuoy}
          title="No tickets yet"
          description="Need help? Raise a ticket and we'll respond here."
        />
      )}

      <NewTicketDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{ticket.subject}</span>
        <Badge variant={STATUS_VARIANT[ticket.status]} className="capitalize">
          {ticket.status.replace('_', ' ')}
        </Badge>
        <Badge variant="outline" className="capitalize">
          {ticket.category}
        </Badge>
        <span className="ml-auto text-xs text-muted-foreground">
          {formatDate(ticket.createdAt)} {formatTime(ticket.createdAt)}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{ticket.message}</p>
      {ticket.replies.length > 0 && (
        <div className="mt-3 space-y-2">
          {ticket.replies.map((r, i) => (
            <div
              key={i}
              className={`rounded-lg p-2.5 text-sm ${r.author === 'feedo' ? 'bg-accent/10' : 'bg-secondary/50'}`}
            >
              <p className="text-xs font-medium text-muted-foreground">
                {r.author === 'feedo' ? 'Feedo Support' : (r.authorName ?? 'You')} · {formatDate(r.createdAt)}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap">{r.message}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
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
