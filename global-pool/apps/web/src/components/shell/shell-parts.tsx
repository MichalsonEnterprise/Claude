'use client';

import { formatUSDT } from '@gp/shared/money';
import {
  Bell,
  Check,
  ChevronDown,
  Globe,
  HeartHandshake,
  LayoutDashboard,
  Lock,
  LogOut,
  Settings,
  Shield,
  ShieldCheck,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { TokenMark } from '@/components/brand/chain-mark';
import { Avatar } from '@/components/ui/avatar';
import { CountBadge, VipBadge, type VipTierName } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { ROUTES } from './nav-config';

/** Data the shell displays for a signed-in player (from the API; DEMO values in demo mode). */
export interface ShellMember {
  handle: string;
  initials: string;
  publicId?: string;
  vipTier?: VipTierName;
  /**
   * Available balance, decimal string. null while the player's real balance is loading (skeleton, never a guess);
   * false when it couldn't be loaded ("—", never an endless skeleton — ERR-03).
   */
  available: string | null | false;
  notifications: number;
  activeEntries: number;
  demo: boolean;
}

// ── Balance pill + Deposit (Wallet/Balance Chip joined to Deposit S) ─────────────────────────────

export function BalancePill({
  member,
  depositDisabled = false,
  compact = false,
  className,
}: {
  member: Pick<ShellMember, 'available' | 'demo'>;
  depositDisabled?: boolean;
  /** Mobile: smaller text, no DEMO text chip (DEMO dot instead). */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-10 items-center rounded-md border border-border-default bg-bg-secondary',
        className,
      )}
    >
      <Link
        href={ROUTES.wallet}
        className="flex h-full items-center gap-2 rounded-l-md pr-2.5 pl-3 transition-colors hover:bg-surface-hover"
        aria-label={
          member.available === null
            ? 'Available balance loading — open wallet'
            : member.available === false
              ? 'Available balance couldn’t be loaded — open wallet'
              : `Available balance ${formatUSDT(member.available)}${member.demo ? ' (demo)' : ''} — open wallet`
        }
      >
        <TokenMark size={compact ? 16 : 18} />
        {member.available === null ? (
          <Skeleton className={cn('h-4', compact ? 'w-12' : 'w-16')} />
        ) : member.available === false ? (
          <span
            title="Balance couldn’t be loaded"
            className={cn('text-text-tertiary', compact ? 'text-label-s' : 'text-label-m')}
          >
            —
          </span>
        ) : (
          <span
            className={cn(
              'tabular-nums text-text-primary',
              compact ? 'text-label-s' : 'text-label-m',
            )}
          >
            {formatUSDT(member.available, { symbol: false })}
          </span>
        )}
        {member.demo && <DemoBadge size="xs" />}
      </Link>
      <Button
        asChild={!depositDisabled}
        size="s"
        disabled={depositDisabled}
        className={cn('mr-1 h-8', compact && 'px-2.5')}
      >
        {depositDisabled ? 'Deposit' : <Link href={ROUTES.deposit}>Deposit</Link>}
      </Button>
    </div>
  );
}

// ── Notifications trigger (Nav/Notifications Trigger) ────────────────────────────────────────────

export function NotificationsButton({ count, className }: { count: number; className?: string }) {
  return (
    <Link
      href={ROUTES.notifications}
      aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
      className={cn(
        'relative inline-flex size-10 items-center justify-center rounded-md text-icon-default transition-colors hover:bg-surface-hover',
        className,
      )}
    >
      <Bell aria-hidden className="size-5" />
      {count > 0 && <CountBadge count={count} className="absolute top-1 right-1" />}
    </Link>
  );
}

// ── Wrong network (Button/Wallet State=Wrong network) ───────────────────────────────────────────

export function WrongNetworkButton({
  onSwitch,
  compact = false,
}: {
  onSwitch?: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSwitch}
      className="inline-flex h-10 items-center gap-2 rounded-md border border-status-warning/50 bg-status-warning-tint px-3 text-label-m text-text-warning transition-colors hover:bg-amber-950"
    >
      <TriangleAlert aria-hidden className="size-4" />
      {compact ? 'Wrong network' : 'Wrong network · Switch to Arbitrum'}
    </button>
  );
}

// ── User menu (Nav/Avatar Trigger + Menu/User) ──────────────────────────────────────────────────

export function UserMenu({ member, onSignOut }: { member: ShellMember; onSignOut: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-10 items-center gap-1 rounded-full pr-1 transition-colors hover:bg-surface-hover data-[state=open]:bg-surface-hover"
        aria-label={`Account menu for ${member.handle}`}
      >
        <Avatar initials={member.initials} size="l" tone="brand" />
        <ChevronDown aria-hidden className="size-4 text-icon-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[300px]">
        <div className="flex items-center gap-3 px-3 pt-3 pb-2">
          <Avatar initials={member.initials} size="l" tone="brand" />
          <div className="min-w-0">
            <p className="truncate text-label-m">{member.handle}</p>
            <p className="flex items-center gap-2 text-caption text-text-tertiary">
              {member.publicId}
              {member.vipTier && <VipBadge tier={member.vipTier} />}
            </p>
          </div>
        </div>
        <div className="mx-2 mb-1 rounded-md bg-bg-secondary px-3 py-2.5">
          <p className="text-caption text-text-tertiary">Available</p>
          <p className="flex items-center gap-2 text-number-s tabular-nums">
            {member.available === null ? (
              <Skeleton className="h-5 w-24" />
            ) : member.available === false ? (
              <span className="text-text-tertiary">Couldn’t load</span>
            ) : (
              formatUSDT(member.available)
            )}
            {member.demo && <DemoBadge size="xs" />}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={ROUTES.dashboard}>
            <LayoutDashboard aria-hidden /> Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={ROUTES.wallet}>
            <Wallet aria-hidden /> Wallet
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`${ROUTES.account}/security`}>
            <Shield aria-hidden /> Security
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={ROUTES.responsibleGaming}>
            <HeartHandshake aria-hidden /> Responsible gaming
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={ROUTES.account}>
            <Settings aria-hidden /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={onSignOut}>
          <LogOut aria-hidden /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Language & region (Nav/Language Trigger + Menu/Language & Region) ───────────────────────────

const LANGUAGES = [
  'English',
  'Português',
  'Español',
  'Deutsch',
  'Français',
  'Polski',
  'Türkçe',
  '日本語',
];

export function LanguageMenu({
  variant = 'full',
  className,
}: {
  /** 'full' = "English · Portugal" button, 'icon' = globe icon (rail / topbar). */
  variant?: 'full' | 'icon';
  className?: string;
}) {
  const [lang, setLang] = React.useState('English');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Language and region: ${lang}, Portugal`}
        className={cn(
          'inline-flex items-center gap-2 rounded-md text-body-s-strong text-text-primary transition-colors hover:bg-surface-hover data-[state=open]:bg-surface-hover',
          variant === 'full'
            ? 'h-10 w-full border border-border-default px-3'
            : 'size-10 justify-center text-icon-default',
          className,
        )}
      >
        <Globe aria-hidden className="size-[18px] shrink-0 text-icon-muted" />
        {variant === 'full' && (
          <>
            <span className="truncate">{lang} · Portugal</span>
            <ChevronDown aria-hidden className="ml-auto size-4 text-icon-muted" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-[300px]">
        <DropdownMenuLabel>Language</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={lang} onValueChange={setLang}>
          {LANGUAGES.map((l) => (
            <DropdownMenuRadioItem key={l} value={l} disabled={l !== 'English'}>
              {l}
              {l !== 'English' && (
                <span className="ml-auto pr-6 text-caption text-text-tertiary">Soon</span>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Region</DropdownMenuLabel>
        <div className="flex items-center gap-2.5 px-3 py-2 text-body-s">
          <Lock aria-hidden className="size-4 text-icon-muted" />
          <span>Portugal</span>
          <span className="ml-auto inline-flex items-center gap-1 text-caption text-text-success">
            <Check aria-hidden className="size-3.5" /> Permitted
          </span>
        </div>
        <p className="px-3 pb-2 text-caption text-text-tertiary">
          Region is detected from your connection and KYC — it can&apos;t be changed here.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Licence notice (Notice/Licence Compact) ─────────────────────────────────────────────────────

export function LicenceNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-md border border-border-subtle bg-surface-default px-2.5 py-2 text-caption text-text-secondary',
        className,
      )}
    >
      <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-icon-muted" />
      <span>Licence required · Permitted regions only</span>
    </p>
  );
}
