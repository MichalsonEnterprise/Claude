import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Table primitives (Figma CMP-05): overline header cells, Comfortable 56 / Compact 40 rows, right-aligned
 * number columns, hover rows. Wrap in <TableContainer> for horizontal scroll on small screens.
 */
export function TableContainer({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        'relative w-full overflow-x-auto rounded-lg border border-border-subtle bg-surface-default',
        className,
      )}
      {...props}
    />
  );
}

export function Table({
  className,
  density = 'comfortable',
  ...props
}: React.ComponentProps<'table'> & { density?: 'comfortable' | 'compact' }) {
  return (
    <table
      data-slot="table"
      data-density={density}
      className={cn('group/table w-full caption-bottom border-collapse text-body-s', className)}
      {...props}
    />
  );
}

export function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead data-slot="table-header" className={cn('bg-bg-secondary/60', className)} {...props} />
  );
}

export function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
}

export function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('border-t border-border-subtle bg-bg-secondary/60 font-medium', className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b border-border-subtle transition-colors hover:bg-surface-hover data-[state=selected]:bg-surface-selected',
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  align = 'left',
  sort,
  onSort,
  children,
  ...props
}: React.ComponentProps<'th'> & {
  align?: 'left' | 'right';
  /** Sorting state; renders a sort button when `onSort` is provided. */
  sort?: 'asc' | 'desc' | 'none';
  onSort?: () => void;
}) {
  const Icon = sort === 'asc' ? ArrowUp : sort === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <th
      data-slot="table-head"
      aria-sort={sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : undefined}
      className={cn(
        'h-10 px-4 text-overline whitespace-nowrap uppercase text-text-tertiary group-data-[density=compact]/table:px-3',
        align === 'right' ? 'text-right' : 'text-left',
        className,
      )}
      {...props}
    >
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            'inline-flex items-center gap-1 uppercase hover:text-text-primary',
            align === 'right' && 'flex-row-reverse',
            sort && sort !== 'none' && 'text-text-primary',
          )}
        >
          {children}
          <Icon aria-hidden className="size-3.5" />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function TableCell({
  className,
  align = 'left',
  ...props
}: React.ComponentProps<'td'> & { align?: 'left' | 'right' }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'h-14 px-4 align-middle whitespace-nowrap text-text-primary group-data-[density=compact]/table:h-10 group-data-[density=compact]/table:px-3',
        align === 'right' && 'text-right tabular-nums',
        className,
      )}
      {...props}
    />
  );
}

export function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('py-3 text-caption text-text-tertiary', className)}
      {...props}
    />
  );
}

/** Two-line cell content: primary + secondary caption. */
export function CellStack({
  primary,
  secondary,
}: {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
}) {
  return (
    <span className="flex flex-col">
      <span className="text-body-s text-text-primary">{primary}</span>
      {secondary && <span className="text-caption text-text-tertiary">{secondary}</span>}
    </span>
  );
}
