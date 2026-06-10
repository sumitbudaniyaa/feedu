import { Construction } from 'lucide-react';
import { EmptyState } from '@feedo/ui';

/** Shell page for modules delivered in later phases. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <EmptyState
        icon={Construction}
        title={`${title} is coming soon`}
        description="This module is part of an upcoming phase. The navigation, layout, and data layer are wired and ready."
      />
    </div>
  );
}
