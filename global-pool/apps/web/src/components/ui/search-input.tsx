'use client';

import { Search, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { InputControl, InputGroup } from './input';

export interface SearchInputProps extends Omit<React.ComponentProps<'input'>, 'size' | 'type'> {
  size?: 's' | 'm';
  /** Register the global ⌘K / Ctrl+K shortcut that focuses this field and show the hint chip. */
  shortcut?: boolean;
  onClear?: () => void;
  groupClassName?: string;
}

/** Input/Search: S 32 / M 40, ⌘K chip (Default) → Esc (Focus), clear button when filled. */
export function SearchInput({
  size = 'm',
  shortcut = false,
  onClear,
  value,
  placeholder = 'Search games, rounds…',
  groupClassName,
  onKeyDown,
  ...props
}: SearchInputProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [focused, setFocused] = React.useState(false);
  const [isMac, setIsMac] = React.useState(true);
  const filled = typeof value === 'string' ? value.length > 0 : false;

  React.useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcut]);

  return (
    <InputGroup size={size} className={cn('bg-surface-default', groupClassName)}>
      <Search
        aria-hidden
        className={cn('text-icon-muted', size === 's' ? 'size-4' : 'size-[18px]')}
      />
      <InputControl
        ref={ref}
        type="search"
        role="searchbox"
        value={value}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') ref.current?.blur();
          onKeyDown?.(e);
        }}
        {...props}
      />
      {filled && onClear ? (
        <button
          type="button"
          onClick={() => {
            onClear();
            ref.current?.focus();
          }}
          aria-label="Clear search"
          className="-mr-1 flex size-7 items-center justify-center rounded-sm text-icon-muted hover:bg-surface-hover hover:text-icon-default"
        >
          <X aria-hidden className="size-4" />
        </button>
      ) : (
        shortcut && (
          <kbd
            aria-hidden
            className="hidden h-6 items-center rounded-xs border border-border-default bg-surface-raised px-1.5 font-sans text-[11px] font-medium text-text-tertiary tablet:inline-flex"
          >
            {focused ? 'Esc' : isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        )
      )}
    </InputGroup>
  );
}
