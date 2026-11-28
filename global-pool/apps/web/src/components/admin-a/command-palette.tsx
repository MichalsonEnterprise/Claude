'use client';

/**
 * Nav/Command Palette (ADM-00): ⌘K / Ctrl K from anywhere in the console. Searches pages (locked ones say "No access"
 * and lead to the no-permission state) and players (GET /admin/users?q=, needs users.read). Keyboard: ↑ ↓ to move,
 * Enter to open, Esc to close. Opening a result never performs an action — it only navigates.
 */
import { formatHandle } from '@gp/shared/format';
import { CornerDownLeft, FileText, Lock, Search, SearchX, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DemoBadge } from '@/components/ui/demo-badge';
import { getUsers, type AdminUserRow } from '@/lib/api/admin-a';
import { cn } from '@/lib/utils';

import { adminDestinations } from './nav-config';
import { KycChip } from './primitives';
import { useAdminSession } from './session';

interface Result {
  id: string;
  kind: 'page' | 'user' | 'action';
  group: 'Users' | 'Actions' | 'Pages';
  label: string;
  meta: string;
  href: string;
  locked?: boolean;
  demo?: boolean;
  user?: AdminUserRow;
}

export function useCommandPaletteShortcut(open: () => void) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const { canAny, can } = useAdminSession();
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);
  const [users, setUsers] = React.useState<AdminUserRow[]>([]);
  const [searching, setSearching] = React.useState(false);
  const listId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setQuery('');
      setUsers([]);
      setActive(0);
    }
  }, [open]);

  // Debounced player search (only with users.read).
  React.useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2 || !can('users.read')) {
      setUsers([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      getUsers({ q: q.slice(0, 64), pageSize: 5 })
        .then((r) => {
          if (!ctrl.signal.aborted) setUsers(r.items);
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setUsers([]);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setSearching(false);
        });
    }, 250);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [query, open, can]);

  const results = React.useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const pages: Result[] = adminDestinations()
      .filter((d) => !q || `${d.label} ${d.group}`.toLowerCase().includes(q))
      .map((d) => ({
        id: `page:${d.href}:${d.label}`,
        kind: 'page' as const,
        group: 'Pages' as const,
        label: d.label,
        meta: d.group,
        href: d.href,
        locked: !canAny(d.anyOf),
      }));
    const people: Result[] = users.map((u) => ({
      id: `user:${u.id}`,
      kind: 'user' as const,
      group: 'Users' as const,
      label: u.handle ? formatHandle(u.handle) : u.publicId,
      meta: `${u.publicId} · ${u.emailMasked ?? 'no email'}`,
      href: `/admin/users/${u.id}`,
      demo: u.isDemo,
      user: u,
    }));
    // Navigation shortcuts for the best match (they open pages; nothing runs from the palette).
    const top = users[0];
    const who = top ? (top.handle ? formatHandle(top.handle) : top.publicId) : '';
    const actions: Result[] = top
      ? [
          {
            id: `action:profile:${top.id}`,
            kind: 'action' as const,
            group: 'Actions' as const,
            label: `Open user profile — ${who}`,
            meta: 'Account, wallets, KYC, AML risk, limits',
            href: `/admin/users/${top.id}`,
          },
          {
            id: `action:audit:${top.id}`,
            kind: 'action' as const,
            group: 'Actions' as const,
            label: `View audit history — ${who}`,
            meta: 'Append-only log of every admin action on this account',
            href: `/admin/users/${top.id}/audit`,
            locked: !can('audit.read'),
          },
          {
            id: `action:restrict:${top.id}`,
            kind: 'action' as const,
            group: 'Actions' as const,
            label: 'Apply account restriction…',
            meta: 'Requires reason + 2FA re-authentication · audited',
            href: `/admin/users/${top.id}/restrictions?apply=1`,
            locked: !can('users.restrict'),
          },
        ]
      : [];
    return [...people.slice(0, 5), ...actions, ...pages].slice(0, 16);
  }, [query, users, canAny, can]);

  React.useEffect(() => setActive(0), [query, users.length]);

  const go = (r: Result | undefined) => {
    if (!r) return;
    onOpenChange(false);
    router.push(r.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[active]);
    }
  };

  const activeId = results[active] ? `${listId}-${active}` : undefined;
  const empty = query.trim().length > 0 && results.length === 0 && !searching;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="l"
        showClose={false}
        className="top-[12vh] translate-y-0 p-0"
        data-testid="admin-command-palette"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search admin pages and players. Use the arrow keys to move and Enter to open.
        </DialogDescription>
        <div className="flex items-center gap-3 border-b border-border-subtle px-4">
          <Search aria-hidden className="size-5 text-icon-muted" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={activeId}
            aria-label="Search users, pages…"
            placeholder="Search users (handle, GP-id, email) or pages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="h-14 flex-1 bg-transparent text-body-m text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <kbd className="rounded-xs border border-border-default px-1.5 py-0.5 font-mono text-mono-s text-text-tertiary">
            Esc
          </kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {empty ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center" role="status">
              <SearchX aria-hidden className="size-8 text-icon-muted" />
              <p className="text-label-l text-text-primary">No results for “{query.trim()}”</p>
              <p className="max-w-sm text-body-s text-text-secondary">
                Try a player handle (@nova.k), a public id (GP-48213) or a page name such as
                “Audit”. Results only include what your role can open.
              </p>
            </div>
          ) : (
            <ul id={listId} role="listbox" aria-label="Results" className="flex flex-col gap-0.5">
              {results.map((r, i) => (
                <React.Fragment key={r.id}>
                  {(i === 0 || results[i - 1]!.group !== r.group) && (
                    <li
                      role="presentation"
                      className="px-3 pt-3 pb-1 text-overline uppercase text-text-tertiary"
                    >
                      {r.group}
                    </li>
                  )}
                  <li
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    aria-disabled={r.locked || undefined}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') go(r);
                    }}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2',
                      i === active ? 'bg-surface-raised' : 'hover:bg-surface-hover',
                    )}
                  >
                    {r.kind === 'user' ? (
                      <User aria-hidden className="size-4 shrink-0 text-icon-muted" />
                    ) : r.locked ? (
                      <Lock aria-hidden className="size-4 shrink-0 text-text-disabled" />
                    ) : (
                      <FileText aria-hidden className="size-4 shrink-0 text-icon-muted" />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span
                        className={cn(
                          'truncate text-label-m',
                          r.locked ? 'text-text-disabled' : 'text-text-primary',
                        )}
                      >
                        {r.label}
                      </span>
                      <span className="truncate text-caption text-text-tertiary">{r.meta}</span>
                    </span>
                    {r.user && <KycChip level={r.user.kycLevel} />}
                    {r.demo && <DemoBadge size="xs" />}
                    {r.locked && <span className="text-caption text-text-tertiary">No access</span>}
                    {i === active && (
                      <CornerDownLeft aria-hidden className="size-4 text-icon-muted" />
                    )}
                  </li>
                </React.Fragment>
              ))}
              {searching && (
                <li role="status" className="px-3 py-2 text-caption text-text-tertiary">
                  Searching players…
                </li>
              )}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-4 py-2.5 text-caption text-text-tertiary">
          <span>↑ ↓ to move · Enter to open · opening a result never runs an action</span>
          <span className="hidden tablet:inline">Personal data stays masked in results</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
