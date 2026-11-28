/** Pure helpers of the account module (unit-tested in test/account.test.ts). */
import { ROUTES } from '@/components/shell/nav-config';
import type { KycView, NotificationView } from '@/lib/api/account';

import { ACCOUNT_ROUTES, HISTORY_ROUTES } from './nav';

/** Action link for a notification, derived from its type and the reference in its text. */
export function notificationAction(
  n: Pick<NotificationView, 'type' | 'title' | 'body'>,
): { label: string; href: string } | null {
  const text = `${n.title} ${n.body}`;
  const wd = /WD-\d+/.exec(text)?.[0];
  const dp = /DP-\d+/.exec(text)?.[0];
  if (n.type.startsWith('withdrawal.'))
    return { label: 'View status', href: wd ? `${ROUTES.wallet}/withdraw/${wd}` : ROUTES.wallet };
  if (n.type.startsWith('deposit.'))
    return {
      label: n.type === 'deposit.credited' ? 'View receipt' : 'Track deposit',
      href: dp ? `${HISTORY_ROUTES.transactions}?q=${dp}` : ROUTES.wallet,
    };
  if (n.type === 'round.cancelled') return { label: 'View refund', href: ROUTES.entries };
  if (n.type.startsWith('round.')) return { label: 'View round', href: ROUTES.pool };
  if (n.type.startsWith('security.'))
    return { label: 'Review device', href: ACCOUNT_ROUTES.devices };
  if (n.type.startsWith('kyc.')) return { label: 'View verification', href: ACCOUNT_ROUTES.kyc };
  if (n.type.startsWith('vip.') || n.type.startsWith('promo.'))
    return { label: 'View terms', href: ROUTES.promotions };
  if (n.type.startsWith('account.')) return { label: 'View details', href: ACCOUNT_ROUTES.profile };
  return null;
}

export type KycState = 'not_started' | 'draft' | 'review' | 'verified' | 'fix';

export function kycState(k: KycView | undefined): KycState {
  const app = k?.application;
  if (!app) return k && k.currentLevel !== 'none' ? 'verified' : 'not_started';
  if (app.status === 'not_started') return 'draft';
  if (app.status === 'pending' || app.status === 'in_review') return 'review';
  if (app.status === 'resubmission_required' || app.status === 'rejected') return 'fix';
  return k.currentLevel === 'none' ? 'not_started' : 'verified';
}
