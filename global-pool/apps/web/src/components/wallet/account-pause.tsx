'use client';

import { MessageCircle } from 'lucide-react';
import Link from 'next/link';

import { RegulatoryNotice } from '@/components/compliance/regulatory-state';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { AccountStatus } from '@/lib/api/auth';

/**
 * What the account gate (`GET /auth/account-status`) pauses right now, for one action — so the wallet and Global Pool
 * flows can say it up front (Q16 · Q17 · Q19) instead of letting the player fill in a form the API will refuse.
 * The API stays authoritative: these notices only explain what the server already enforces.
 */
export type PauseAction = 'gaming' | 'deposits' | 'withdrawals';
type RestrictionType = AccountStatus['restrictions'][number]['type'];

export type AccountPause =
  | { kind: 'cooling_off'; endsAt: string | null }
  | { kind: 'self_excluded'; endsAt: string | null }
  | { kind: 'region'; countryName: string | null }
  | { kind: 'restriction'; restriction: RestrictionType; reference: string | null };

/** Which restriction pauses which action (mirrors the API route policies in apps/api/src/modules/auth/guards.ts). */
const BLOCKED_BY: Record<PauseAction, RestrictionType[]> = {
  gaming: ['account_suspended', 'gaming_blocked'],
  deposits: ['account_suspended', 'deposits_blocked'],
  // Withdrawals stay open during a break, a self-exclusion, abroad and even while suspended; only an AML freeze holds them.
  withdrawals: ['withdrawals_frozen'],
};

export function accountPause(
  status: Pick<AccountStatus, 'paused' | 'restrictions' | 'selfExclusion' | 'region'> | null | undefined,
  action: PauseAction,
): AccountPause | null {
  if (!status || !status.paused[action]) return null;
  const restriction = status.restrictions.find((r) => BLOCKED_BY[action].includes(r.type));
  // A suspension outranks everything; for withdrawals only the freeze applies.
  if (restriction && (restriction.type === 'account_suspended' || action === 'withdrawals')) {
    return { kind: 'restriction', restriction: restriction.type, reference: restriction.reference };
  }
  if (action !== 'withdrawals' && status.selfExclusion.active) {
    return status.selfExclusion.kind === 'cooling_off'
      ? { kind: 'cooling_off', endsAt: status.selfExclusion.endsAt }
      : { kind: 'self_excluded', endsAt: status.selfExclusion.endsAt };
  }
  if (action !== 'withdrawals' && !status.region.permitted) {
    const where = status.region.current ?? status.region.declared;
    return { kind: 'region', countryName: where?.name ?? null };
  }
  if (restriction) {
    return { kind: 'restriction', restriction: restriction.type, reference: restriction.reference };
  }
  // Paused for a reason this build does not know yet: still say it is paused (never silently allow).
  return { kind: 'restriction', restriction: BLOCKED_BY[action][0]!, reference: null };
}

const WHAT: Record<PauseAction, string> = {
  gaming: 'Global Pool entries and games',
  deposits: 'Deposits',
  withdrawals: 'Withdrawals',
};

/** Copy for an admin restriction (never the internal reason — only the case reference). */
export function restrictionCopy(
  pause: Extract<AccountPause, { kind: 'restriction' }>,
  action: PauseAction,
): { title: string; body: string } {
  const ref = pause.reference ? ` (case ${pause.reference})` : '';
  if (pause.restriction === 'account_suspended') {
    return {
      title: 'Your account is suspended while a required check is completed',
      body: `${WHAT[action]} are paused${ref}. Your money is safe and withdrawals stay available. Support can tell you exactly what we need.`,
    };
  }
  if (action === 'withdrawals') {
    return {
      title: 'Withdrawals are on hold while we review your account',
      body: `A compliance hold applies to withdrawals${ref}. Nothing has been sent or deducted — your balance stays in your account. Support can explain what’s needed.`,
    };
  }
  return {
    title: `${WHAT[action]} are paused while we review your account`,
    body: `Our team is completing a review${ref}. Your balance stays yours and withdrawals stay available. Support can explain what’s needed.`,
  };
}

/** Inline notice for a paused action: the shared ERR-05 notice for breaks / region, a review notice otherwise. */
export function AccountPauseNotice({
  pause,
  action,
  className,
}: {
  pause: AccountPause;
  action: PauseAction;
  className?: string;
}) {
  if (pause.kind === 'cooling_off' || pause.kind === 'self_excluded') {
    return <RegulatoryNotice kind={pause.kind} ctx={{ endsAt: pause.endsAt }} className={className} />;
  }
  if (pause.kind === 'region') {
    return (
      <RegulatoryNotice kind="region" ctx={{ countryName: pause.countryName }} className={className} />
    );
  }
  const copy = restrictionCopy(pause, action);
  return (
    <Alert
      type="restricted"
      title={copy.title}
      className={className}
      actions={
        <>
          <Button asChild size="s" variant="secondary" leadingIcon={<MessageCircle />}>
            <Link href="/support">Contact support</Link>
          </Button>
          <Button asChild size="s" variant="ghost">
            <Link href="/restricted">Account status</Link>
          </Button>
        </>
      }
    >
      {copy.body}
    </Alert>
  );
}
