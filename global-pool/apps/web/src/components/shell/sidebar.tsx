'use client';

import { formatUSDT } from '@gp/shared/money';
import { ChevronDown, CircleDollarSign, Crown } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { AgeBadge, CountBadge, StatusBadge } from '@/components/ui/badge';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

import { ACCOUNT_NAV, PRIMARY_NAV, ROUTES, type NavItem } from './nav-config';
import { LanguageMenu, LicenceNotice } from './shell-parts';

export type SidebarMode = 'auto' | 'expanded' | 'collapsed';
export type ShellAuth = 'guest' | 'member' | 'loading';

export interface SidebarCounts {
  entries?: number;
  notifications?: number;
}

/** Most specific nav href matching the path (so /pool/entries highlights "My entries", not "Global Pool"). */
export function resolveActiveHref(pathname: string): string | null {
  const all = [...PRIMARY_NAV, ...ACCOUNT_NAV].flatMap((i) => [i, ...(i.children ?? [])]);
  let best: string | null = null;
  for (const item of all) {
    const match =
      item.href === '/'
        ? pathname === '/'
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (match && (best === null || item.href.length > best.length)) best = item.href;
  }
  return best;
}

// ── items ──────────────────────────────────────────────────────────────────────────────────────

function RailTooltip({
  label,
  enabled,
  children,
}: {
  label: string;
  enabled: boolean;
  children: React.ReactElement;
}) {
  if (!enabled) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

const itemBase =
  'group/item relative flex w-full items-center gap-3 rounded-md px-3 text-body-s-strong text-text-secondary transition-colors duration-150 ease-standard hover:bg-surface-hover hover:text-text-primary aria-[current=page]:bg-brand-tint aria-[current=page]:text-text-brand rail:justify-center rail:px-0';

function ItemIcon({ icon: Icon }: { icon: NavItem['icon'] }) {
  return (
    <Icon
      aria-hidden
      className="size-5 shrink-0 text-icon-muted transition-colors group-hover/item:text-icon-default group-aria-[current=page]/item:text-icon-brand"
    />
  );
}

function NavLink({
  item,
  activeHref,
  counts,
  rail,
  density,
  child = false,
  onNavigate,
}: {
  item: NavItem;
  activeHref: string | null;
  counts: SidebarCounts;
  rail: boolean;
  density: 'sidebar' | 'drawer';
  child?: boolean;
  onNavigate?: () => void;
}) {
  const active = activeHref === item.href;
  const count = item.countKey ? counts[item.countKey] : undefined;
  return (
    <RailTooltip label={item.label} enabled={rail}>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        aria-label={rail ? item.label : undefined}
        className={cn(itemBase, density === 'drawer' ? 'h-11' : 'h-9', child && 'pl-8 rail:pl-0')}
      >
        {active && (
          <span
            aria-hidden
            className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-brand"
          />
        )}
        <ItemIcon icon={item.icon} />
        <span className="truncate rail:sr-only">{item.label}</span>
        {item.live && <StatusBadge status="live" uppercase className="ml-auto rail:hidden" />}
        {count !== undefined && count > 0 && (
          <CountBadge
            count={count}
            tone="neutral"
            className="ml-auto rail:absolute rail:top-0 rail:right-0 rail:ml-0"
          />
        )}
      </Link>
    </RailTooltip>
  );
}

function NavGroup({
  item,
  activeHref,
  counts,
  rail,
  density,
  onNavigate,
}: {
  item: NavItem;
  activeHref: string | null;
  counts: SidebarCounts;
  rail: boolean;
  density: 'sidebar' | 'drawer';
  onNavigate?: () => void;
}) {
  const childActive = item.children?.some((c) => c.href === activeHref) ?? false;
  const [open, setOpen] = React.useState(Boolean(item.defaultOpen) || childActive);
  const listId = React.useId();
  return (
    <li>
      {/* Expanded: disclosure button. Rail: link to the section page (children are hidden). */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={cn(itemBase, density === 'drawer' ? 'h-11' : 'h-9', 'rail:hidden')}
      >
        <ItemIcon icon={item.icon} />
        <span className="truncate">{item.label}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            'ml-auto size-4 text-icon-muted transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>
      <div className="hidden rail:block">
        <NavLink
          item={item}
          activeHref={activeHref}
          counts={counts}
          rail={rail}
          density={density}
          onNavigate={onNavigate}
        />
      </div>
      <ul id={listId} hidden={!open} className="flex flex-col rail:hidden">
        {item.children?.map((c) => (
          <li key={c.id}>
            <NavLink
              item={c}
              activeHref={activeHref}
              counts={counts}
              rail={false}
              density={density}
              child
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </li>
  );
}

export interface SidebarNavProps {
  auth: ShellAuth;
  activeHref: string | null;
  counts?: SidebarCounts;
  /** True when the rail is showing (enables tooltips). */
  rail?: boolean;
  density?: 'sidebar' | 'drawer';
  onNavigate?: () => void;
}

/** Navigation lists (primary + account), shared by the desktop sidebar and the mobile drawer. */
export function SidebarNav({
  auth,
  activeHref,
  counts = {},
  rail = false,
  density = 'sidebar',
  onNavigate,
}: SidebarNavProps) {
  const member = auth === 'member';
  const render = (item: NavItem) =>
    item.children ? (
      <NavGroup
        key={item.id}
        item={item}
        activeHref={activeHref}
        counts={counts}
        rail={rail}
        density={density}
        onNavigate={onNavigate}
      />
    ) : (
      <li key={item.id}>
        <NavLink
          item={item}
          activeHref={activeHref}
          counts={counts}
          rail={rail}
          density={density}
          onNavigate={onNavigate}
        />
      </li>
    );
  return (
    <>
      <ul className="flex flex-col">{PRIMARY_NAV.map(render)}</ul>
      <div role="separator" className="my-2.5 h-px bg-border-subtle" />
      <ul className="flex flex-col" aria-label="Account">
        {ACCOUNT_NAV.filter((i) => member || !i.memberOnly).map(render)}
      </ul>
    </>
  );
}

// ── promo tiles ────────────────────────────────────────────────────────────────────────────────

export function SidebarPromoTiles({ poolAmount, demo }: { poolAmount: string; demo: boolean }) {
  return (
    <>
      <div className="grid grid-cols-[1fr_auto] gap-2 rail:hidden">
        <Link
          href={ROUTES.pool}
          className="flex min-w-0 flex-col gap-0.5 rounded-md bg-gradient-gold-jackpot p-2.5 text-text-on-gold shadow-elevation-1 transition-[filter] hover:brightness-105"
        >
          <span className="flex items-center gap-1 text-label-s">
            <CircleDollarSign aria-hidden className="size-3.5" /> Global Pool
          </span>
          <span className="text-number-s font-semibold tabular-nums">
            {formatUSDT(poolAmount, { symbol: false })}
          </span>
          <span className="flex items-center gap-1.5 text-caption">
            USDT
            {demo && (
              <DemoBadge size="xs" className="border-ink-950/60 bg-ink-950/10 text-ink-950" />
            )}
          </span>
        </Link>
        <Link
          href={ROUTES.vip}
          className="flex w-[84px] flex-col gap-0.5 rounded-md border border-border-default bg-surface-raised px-2 py-2.5 transition-colors hover:border-border-strong"
        >
          <span className="flex items-center gap-1 whitespace-nowrap text-label-s text-text-primary">
            <Crown aria-hidden className="size-3.5 shrink-0 text-icon-gold" /> VIP Club
          </span>
          <span className="text-caption text-text-tertiary">29 levels · 5 tiers</span>
        </Link>
      </div>
      <div className="hidden flex-col items-center gap-2 rail:flex">
        <RailTooltip
          label={`Global Pool — ${formatUSDT(poolAmount)}${demo ? ' (DEMO)' : ''}`}
          enabled
        >
          <Link
            href={ROUTES.pool}
            aria-label="Global Pool"
            className="flex size-12 items-center justify-center rounded-md bg-gradient-gold-jackpot text-text-on-gold"
          >
            <CircleDollarSign aria-hidden className="size-5" />
          </Link>
        </RailTooltip>
        <RailTooltip label="VIP Club" enabled>
          <Link
            href={ROUTES.vip}
            aria-label="VIP Club"
            className="flex size-12 items-center justify-center rounded-md border border-border-default bg-surface-raised text-icon-gold"
          >
            <Crown aria-hidden className="size-5" />
          </Link>
        </RailTooltip>
      </div>
    </>
  );
}

// ── sidebar ────────────────────────────────────────────────────────────────────────────────────

export interface SidebarProps {
  auth: ShellAuth;
  /** 'auto' = 240 expanded ≥1280 px, 72 rail 1024–1279 px; 'expanded' / 'collapsed' force a state. */
  mode?: SidebarMode;
  activeHref: string | null;
  counts?: SidebarCounts;
  /** Pool balance for the gold promo tile (decimal string). */
  poolAmount: string;
  demo?: boolean;
  /** Hide promo tiles (e.g. while self-excluded, decision #30). */
  hidePromos?: boolean;
  /** Not sticky / full-height (design-system previews). */
  embedded?: boolean;
  className?: string;
}

/** Shell/Sidebar (CASINO-01): bg/secondary, right hairline, promo tiles, scrolling nav, pinned footer. */
export function Sidebar({
  auth,
  mode = 'auto',
  activeHref,
  counts,
  poolAmount,
  demo = true,
  hidePromos = false,
  embedded = false,
  className,
}: SidebarProps) {
  const isLaptop = useMediaQuery(MQ.laptop, true);
  const rail = mode === 'collapsed' || (mode === 'auto' && !isLaptop);
  return (
    <aside
      aria-label="Sidebar"
      data-sidebar-state={mode}
      className={cn(
        'flex w-sidebar shrink-0 flex-col border-r border-border-subtle bg-bg-secondary transition-[width] duration-200 ease-standard rail:w-sidebar-collapsed',
        embedded
          ? 'h-full'
          : 'sticky top-[var(--gp-shell-top,0px)] h-[calc(100dvh-var(--gp-shell-top,0px))]',
        className,
      )}
    >
      {!hidePromos && (
        <div className="px-3 pt-3 pb-2">
          <SidebarPromoTiles poolAmount={poolAmount} demo={demo} />
        </div>
      )}
      <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <SidebarNav auth={auth} activeHref={activeHref} counts={counts} rail={rail} />
      </nav>
      <div className="flex flex-col gap-2.5 border-t border-border-subtle p-3">
        <div className="rail:hidden">
          <LanguageMenu />
        </div>
        <div className="hidden justify-center rail:flex">
          <LanguageMenu variant="icon" />
        </div>
        <div className="flex items-center gap-2 rail:justify-center">
          <AgeBadge />
          <LicenceNotice className="flex-1 rail:hidden" />
        </div>
      </div>
    </aside>
  );
}
