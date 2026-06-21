import { useState } from 'react';
import { CalendarClock, Inbox, Mail, MapPin, Phone, Store } from 'lucide-react';
import { Badge, Card, EmptyState, Select, Skeleton } from '@feedo/ui';
import { formatRelativeTime } from '@feedo/utils';
import type { Lead, LeadStatus } from '@feedo/types';
import { useLeads, useUpdateLeadStatus } from '../lib/api.js';

const STATUSES: LeadStatus[] = ['new', 'contacted', 'converted', 'closed'];
const STATUS_VARIANT: Record<LeadStatus, 'warning' | 'accent' | 'success' | 'default'> = {
  new: 'warning',
  contacted: 'accent',
  converted: 'success',
  closed: 'default',
};

export function LeadsPage() {
  const { data, isLoading } = useLeads();
  const updateStatus = useUpdateLeadStatus();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sales enquiries from the marketing site.</p>
        </div>

      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-3">
          {data.map((lead) => (
            <LeadCard
              key={lead._id}
              lead={lead}
              onStatus={(status) => updateStatus.mutate({ id: lead._id, status })}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={Inbox} title="No leads yet" description="Submissions from Book-a-demo and Contact-sales appear here." />
      )}
    </div>
  );
}

function LeadCard({ lead, onStatus }: { lead: Lead; onStatus: (s: LeadStatus) => void }) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{lead.name}</span>

            <Badge variant={STATUS_VARIANT[lead.status]} className="capitalize">
              {lead.status}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {lead.email}</span>
            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {lead.phone}</span>
            {lead.restaurantName && <span className="flex items-center gap-1.5"><Store className="h-3.5 w-3.5" /> {lead.restaurantName}</span>}
            {lead.city && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {lead.city}</span>}
            <span className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> {formatRelativeTime(lead.createdAt)}</span>
          </div>
          {lead.message && <p className="mt-2 max-w-2xl text-sm text-foreground/80">“{lead.message}”</p>}
        </div>
        <Select
          value={lead.status}
          onChange={(e) => onStatus(e.target.value as LeadStatus)}
          className="w-36 shrink-0 capitalize"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </Select>
      </div>
    </Card>
  );
}
