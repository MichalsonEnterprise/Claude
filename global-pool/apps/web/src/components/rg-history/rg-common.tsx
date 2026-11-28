'use client';

import type { RgStateView } from '@gp/shared/schemas';
import { Hourglass, Info, ShieldCheck, TrendingDown } from 'lucide-react';
import * as React from 'react';

import { Card } from '@/components/ui/card';
import { useRgState } from '@/lib/api/rg-history';

import { MemberOnly, PageShell, PageSkeleton, QueryError, type SubNavItem } from './page-shell';
import { Bullet } from './ui';

export const RG_BASE = '/responsible-gaming';
export const RG_NAV: SubNavItem[] = [
  { label: 'Overview', href: RG_BASE },
  { label: 'Deposit limits', href: `${RG_BASE}/deposit-limits` },
  { label: 'Participation limits', href: `${RG_BASE}/participation-limits` },
  { label: 'Time limits', href: `${RG_BASE}/time-limits` },
  { label: 'Reality checks', href: `${RG_BASE}/reality-checks` },
  { label: 'Cooling-off', href: `${RG_BASE}/cooling-off` },
  { label: 'Self-exclusion', href: `${RG_BASE}/self-exclusion` },
];

const DEFAULT_SUB =
  'Tools to keep play enjoyable. Lowering a limit applies straight away; raising one waits 24 hours, so the decision is never made in the moment.';

/** Page frame for every RG screen: shell header + member gate + RG state loading/error handling. */
export function RgPage({
  href,
  title = 'Responsible gaming',
  sub = DEFAULT_SUB,
  mobileSub,
  banner,
  children,
}: {
  href: string;
  title?: string;
  sub?: string;
  mobileSub?: string;
  banner?: (state: RgStateView) => React.ReactNode;
  children: (state: RgStateView) => React.ReactNode;
}) {
  const tab = RG_NAV.find((n) => n.href === href);
  const isHub = href === RG_BASE;
  const query = useRgState();
  return (
    <PageShell
      crumbs={[
        { label: 'Account', href: '/account' },
        { label: 'Responsible gaming', href: RG_BASE },
        ...(isHub || !tab ? [] : [{ label: tab.label }]),
      ]}
      title={title}
      sub={sub}
      mobileSub={mobileSub}
      backHref={isHub ? '/account' : RG_BASE}
      backLabel={isHub ? 'Account' : 'Responsible gaming'}
      nav={RG_NAV}
      activeHref={href}
      navLabel="Responsible gaming sections"
      banner={query.data && banner ? banner(query.data) : undefined}
    >
      <MemberOnly what="responsible-gaming settings">
        {query.isPending ? (
          <PageSkeleton />
        ) : query.isError ? (
          <QueryError error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          children(query.data)
        )}
      </MemberOnly>
    </PageShell>
  );
}

/** "How limit changes work" (RG1 rules card). */
export function LimitRulesCard() {
  return (
    <Card padding="l" className="gap-5">
      <h2 className="text-h5">How limit changes work</h2>
      <Bullet
        icon={TrendingDown}
        title="Lower or add a limit — applies immediately"
        body="Takes effect on your next entry or bet, including in games you already have open."
      />
      <Bullet
        icon={Hourglass}
        tone="pending"
        title="Raise or remove a limit — waits 24 hours"
        body="We confirm by email when the cool-down starts and again when it ends. Cancel any time before it ends and your current limit stays."
      />
      <Bullet
        icon={ShieldCheck}
        title="Breaks and self-exclusion — fixed once started"
        body="They cannot be shortened or cancelled early. Withdrawals, history and support stay available throughout."
      />
      <Bullet
        icon={Info}
        tone="muted"
        title="Same rules on every device"
        body="Limits are stored on your account, not in the browser, and apply on web and mobile alike."
      />
    </Card>
  );
}
