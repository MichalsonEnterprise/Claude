import { STEP_UP_PURPOSES, type StepUpPurpose } from '@gp/shared/enums';
import type { Metadata } from 'next';

import { LobbyBehind } from '@/components/auth/lobby-behind';
import { safeNext } from '@/components/auth/safe-next';
import { StepUpPage } from '@/components/auth/step-up';

export const metadata: Metadata = { title: 'Confirm it’s you' };

/**
 * AUTH-08 step-up challenge as a page (deep links): `/2fa/challenge?purpose=withdrawal&next=/wallet/withdraw`.
 * The token is stored for the next page (`consumeStoredStepUp(purpose)`); in-page flows use `useStepUp()` instead.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = typeof sp.purpose === 'string' ? sp.purpose : '';
  const purpose: StepUpPurpose = (STEP_UP_PURPOSES as readonly string[]).includes(raw)
    ? (raw as StepUpPurpose)
    : 'security_settings';
  const next = safeNext(typeof sp.next === 'string' ? sp.next : undefined);
  return (
    <LobbyBehind>
      <StepUpPage purpose={purpose} next={next} />
    </LobbyBehind>
  );
}
