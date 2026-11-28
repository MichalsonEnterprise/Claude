import { Inbox, SearchX, TriangleAlert, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const ICONS: Record<'no-data' | 'no-results' | 'error', LucideIcon> = {
  'no-data': Inbox,
  'no-results': SearchX,
  error: TriangleAlert,
};

export interface EmptyStateProps {
  type?: 'no-data' | 'no-results' | 'error';
  title: string;
  description?: React.ReactNode;
  /** Primary + secondary actions (Buttons). */
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  /** Error reference shown in mono (Error type). */
  reference?: string;
  className?: string;
}

/** Table/Empty State: No data · No results · Error. */
export function EmptyState({ type = 'no-data', title, description, actions, icon, reference, className }: EmptyStateProps) {
  const Icon = ICONS[type];
  return (
    <div
      role={type === 'error' ? 'alert' : undefined}
      className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}
    >
      <span
        className={cn(
          'flex size-12 items-center justify-center rounded-lg [&_svg]:size-6',
          type === 'error' ? 'bg-status-danger-tint text-text-danger' : 'bg-surface-raised text-icon-muted',
        )}
      >
        {icon ?? <Icon aria-hidden />}
      </span>
      <div className="flex max-w-md flex-col gap-1">
        <p className="text-h5">{title}</p>
        {description && <p className="text-body-s text-text-secondary">{description}</p>}
        {reference && <p className="font-mono text-mono-s text-text-tertiary">Ref {reference}</p>}
      </div>
      {actions && <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
    </div>
  );
}
