'use client';

import { formatUSDT, money } from '@gp/shared/money';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  CircleCheck,
  KeyRound,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import { ROUTES } from '@/components/shell/nav-config';
import { ShellOverride } from '@/components/shell/shell-overrides';
import { Alert } from '@/components/ui/alert';
import { VipBadge, type VipTierName } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useAccountStatus,
  useBalances,
  useCurrentRound,
  useDeposits,
  useGames,
  useLifetime,
  useMe,
  useMyEntries,
  useNotifications,
  useRg,
  useTwoFactor,
  type AccountStatusView,
  type MeView,
} from '@/lib/api/account';
import { statePreviewEnabled } from '@/lib/home-preview';

import { DashboardPage } from '../page-shell';
import { ToneChip } from '../primitives';
import { ActivePoolSection } from './pool';
import { BalancesSection } from './balances';
import {
  GamesPreview,
  LicenceLine,
  NotificationsPreview,
  RecentActivity,
  RgModule,
  SetupChecklist,
  VipStrip,
  WelcomeOfferCard,
} from './sections';

/** Dev-only preview of the restricted state (`/dashboard?state=restricted`); real gating comes from the API. */
function usePreviewRestricted(): boolean {
  const sp = useSearchParams();
  return statePreviewEnabled && (sp.get('state') ?? '').split(',').includes('restricted');
}

function greeting(now: Date): string {
  const h = now.getHours();
  return h < 5
    ? 'Good evening'
    : h < 12
      ? 'Good morning'
      : h < 18
        ? 'Good afternoon'
        : 'Good evening';
}

function firstName(me: MeView | undefined): string {
  const n = me?.displayName?.trim() || me?.handle || '';
  return n.split(/\s+/)[0]?.replace(/\.$/, '') ?? '';
}

export function restrictionCopy(status: AccountStatusView | undefined, preview: boolean) {
  if (preview) return { restricted: true, country: 'United States' };
  if (!status) return { restricted: false, country: null };
  const region = !status.region.permitted;
  return {
    restricted: region || status.paused.gaming,
    country: status.region.current?.name ?? status.region.declared?.name ?? null,
    region,
  };
}

/** USR-01 Dashboard overview: Active, New user (checklist) and Restricted states from live API data. */
export function DashboardOverview() {
  const me = useMe();
  const status = useAccountStatus();
  const balances = useBalances();
  const lifetime = useLifetime();
  const round = useCurrentRound();
  const mine = useMyEntries(round.data?.id);
  const notes = useNotifications({ page: 1, pageSize: 3 });
  const rg = useRg();
  const games = useGames();
  const tfa = useTwoFactor();
  const deposits = useDeposits();
  const previewRestricted = usePreviewRestricted();
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => setNow(new Date()), []);

  const demo = me.data?.isDemo ?? false;
  const gate = restrictionCopy(status.data, previewRestricted);
  const restricted = gate.restricted;
  const depositsPaused = previewRestricted || (status.data?.paused.deposits ?? false);
  const hasDeposit = (deposits.data?.total ?? 0) > 0 || money(lifetime.data?.deposits ?? '0').gt(0);
  const isNew =
    Boolean(balances.data && lifetime.data && deposits.data) &&
    !hasDeposit &&
    money(balances.data?.total ?? '0').isZero() &&
    (lifetime.data?.entries ?? 0) === 0;
  const kycLevel = me.data?.kyc.level ?? 'none';
  const canEnter =
    !restricted &&
    money(balances.data?.available ?? '0').gte(money('10.05')) &&
    kycLevel !== 'none';
  const blockedReason = restricted
    ? undefined
    : kycLevel === 'none'
      ? 'Unlocks after identity verification (KYC Level 1) and your first deposit.'
      : money(balances.data?.available ?? '0').lt(money('10.05'))
        ? 'Deposit first — one entry needs 10.05 USDT in Available.'
        : undefined;

  const name = firstName(me.data);
  const title = !me.data
    ? 'Dashboard'
    : isNew
      ? `Welcome to GLOBAL POOL${name ? `, ${name}` : ''}`
      : `${now ? greeting(now) : 'Hello'}${name ? `, ${name}` : ''}`;

  const chips = me.data ? (
    <>
      <VipBadge tier={me.data.vip.tier as VipTierName} />
      <ToneChip tone={kycLevel === 'none' ? 'neutral' : 'success'} icon={BadgeCheck}>
        KYC{' '}
        {kycLevel === 'none'
          ? 'L0 · Not started'
          : `L${kycLevel.slice(-1)} · ${me.data.kyc.status === 'verified' ? 'Approved' : me.data.kyc.status.replace(/_/g, ' ')}`}
      </ToneChip>
      <ToneChip
        tone={tfa.data?.enabled ? 'success' : 'warning'}
        icon={tfa.data?.enabled ? CircleCheck : KeyRound}
      >
        2FA {tfa.data?.enabled ? 'on' : 'off'}
      </ToneChip>
      <span className="text-caption text-text-tertiary">
        {me.data.displayHandle} · {me.data.publicId}
        {me.data.country?.name ? ` · ${me.data.country.name}` : ''}
      </span>
    </>
  ) : null;

  const actions = (
    <>
      <Button
        variant="secondary"
        size="m"
        leadingIcon={<ArrowUpFromLine aria-hidden />}
        disabled={isNew}
        asChild={!isNew}
      >
        {isNew ? <span>Withdraw</span> : <Link href={`${ROUTES.wallet}/withdraw`}>Withdraw</Link>}
      </Button>
      {depositsPaused ? (
        <Button size="m" disabled leadingIcon={<Lock aria-hidden />}>
          Deposit
        </Button>
      ) : (
        <Button size="m" leadingIcon={<ArrowDownToLine aria-hidden />} asChild>
          <Link href={ROUTES.deposit}>Deposit</Link>
        </Button>
      )}
    </>
  );

  const banner = restricted ? (
    <Alert
      type="restricted"
      title={
        gate.country
          ? `Not available in your region (${gate.country})`
          : 'Gaming is paused on your account'
      }
      actions={
        <>
          <Button size="s" variant="secondary" asChild>
            <Link href={`${ROUTES.wallet}/withdraw`}>Withdraw funds</Link>
          </Button>
          <Button size="s" variant="ghost" asChild>
            <Link href={ROUTES.responsibleGaming}>Limits &amp; self-exclusion</Link>
          </Button>
          <Button size="s" variant="ghost" asChild>
            <Link href={ROUTES.support}>Contact support</Link>
          </Button>
        </>
      }
    >
      Games, deposits and new Global Pool entries are paused
      {gate.country ? ' in your region' : ''}. You can still view your account, withdraw your funds,
      change your limits and contact support. Entries you already hold stay in their round.
    </Alert>
  ) : null;

  return (
    <DashboardPage
      tab="overview"
      crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Overview' }]}
      title={title}
      chips={chips}
      actions={actions}
      demo={demo}
      banner={banner}
    >
      {previewRestricted && <ShellOverride restricted />}
      {isNew && me.data ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 laptop:grid-cols-[minmax(0,1fr)_360px]">
          <SetupChecklist
            restricted={restricted}
            s={{
              emailVerified: me.data.emailVerified,
              emailMasked: me.data.emailMasked,
              twoFactor: tfa.data?.enabled ?? false,
              kycLevel,
              hasDeposit,
            }}
          />
          {!restricted && <WelcomeOfferCard demo />}
        </div>
      ) : (
        me.data && !restricted && <VipStrip me={me.data} balances={balances.data} demo={demo} />
      )}

      <BalancesSection
        balances={balances.data}
        lifetime={lifetime.data}
        dailyLimit={undefined}
        demo={demo}
        updatedAt={balances.dataUpdatedAt}
        isNew={isNew}
      />

      <ActivePoolSection
        round={round.data}
        mine={mine.data}
        restricted={restricted}
        canEnter={canEnter}
        enterBlockedReason={blockedReason}
        demo={round.data?.isDemo ?? demo}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 laptop:grid-cols-[minmax(0,1fr)_360px]">
        <GamesPreview
          games={games.data}
          restricted={restricted}
          title={isNew ? 'Popular right now' : 'Games'}
          demo={games.data?.some((g) => g.isDemo) ?? demo}
        />
        <NotificationsPreview
          items={notes.data?.items}
          unread={notes.data?.unread ?? 0}
          demo={demo}
        />
      </div>

      <RecentActivity demo={demo} isNew={isNew} />
      <RgModule rg={rg.data} isNew={isNew} />
      {balances.data && money(balances.data.owed).gt(0) && restricted && (
        <p className="text-caption text-text-tertiary">
          {formatUSDT(balances.data.owed)} is owed to you and can still be claimed and withdrawn.
        </p>
      )}
      <LicenceLine />
    </DashboardPage>
  );
}
