import * as React from 'react';

import { cn } from '@/lib/utils';

/** Kitchen-sink section wrapper (anchor + title + description). */
export function DsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 border-t border-border-subtle pt-10"
    >
      <div className="mb-6 flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-h3">
          {title}
        </h2>
        {description && <p className="max-w-3xl text-body-s text-text-secondary">{description}</p>}
      </div>
      <div className="flex flex-col gap-8">{children}</div>
    </section>
  );
}

/** A labelled specimen block. */
export function Specimen({
  label,
  children,
  className,
  bodyClassName,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-3', className)}>
      <p className="text-overline uppercase text-text-tertiary">{label}</p>
      <div className={cn('flex flex-wrap items-center gap-3', bodyClassName)}>{children}</div>
    </div>
  );
}

/** Horizontal scroll frame for previews wider than the viewport (shell parts on mobile). */
export function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'max-w-full overflow-x-auto rounded-lg border border-dashed border-border-default',
        className,
      )}
    >
      {children}
    </div>
  );
}

export const DS_SECTIONS = [
  ['foundations', 'Foundations'],
  ['brand', 'Brand & marks'],
  ['buttons', 'Buttons'],
  ['badges', 'Badges & DEMO'],
  ['cards', 'Cards'],
  ['inputs', 'Inputs'],
  ['selects', 'Selects & controls'],
  ['tabs', 'Tabs'],
  ['overlays', 'Overlays & toasts'],
  ['feedback', 'Alerts & states'],
  ['data', 'Data display'],
  ['jackpot', 'Jackpot & countdown'],
  ['games', 'Game tiles'],
  ['shell', 'App shell'],
] as const;
