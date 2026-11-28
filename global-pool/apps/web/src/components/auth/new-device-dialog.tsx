'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CircleCheck, Info, Lock, Mail, ShieldAlert, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { ROUTES } from '@/components/shell/nav-config';
import { Button } from '@/components/ui/button';
import { authApi, authKeys, type NewDeviceAlert } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/context';

import {
  AuthModal,
  Callout,
  KeyValue,
  KeyValueBox,
  Note,
  NumStep,
  Pane,
  PaneHeader,
  Point,
  SecurityArt,
  SecurityPanel,
  SplitLayout,
} from './auth-ui';
import { formatUtcDateTime } from './format';

const DISMISS_KEY = 'gp.newDeviceDismissed';

function readDismissed(): string[] {
  try {
    return JSON.parse(window.sessionStorage.getItem(DISMISS_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

/** Polls `GET /auth/new-device-alerts` for signed-in members and shows AUTH-21 for the newest unanswered one. */
export function NewDeviceAlertHost() {
  const qc = useQueryClient();
  const [dismissed, setDismissed] = React.useState<string[]>([]);
  React.useEffect(() => setDismissed(readDismissed()), []);
  const alerts = useQuery({
    queryKey: authKeys.newDeviceAlerts,
    queryFn: authApi.newDeviceAlerts,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
  const alert = alerts.data?.find((a) => !dismissed.includes(a.sessionId)) ?? null;
  const [secured, setSecured] = React.useState<{ count: number } | null>(null);

  const done = () => void qc.invalidateQueries({ queryKey: authKeys.newDeviceAlerts });
  const confirm = useMutation({ mutationFn: (id: string) => authApi.confirmNewDevice(id), onSuccess: done });
  const secure = useMutation({
    mutationFn: (id: string) => authApi.secureAccount(id),
    onSuccess: (r) => {
      setSecured({ count: r.revokedSessions });
      done();
    },
  });

  const later = () => {
    if (!alert) return;
    const next = [...dismissed, alert.sessionId];
    setDismissed(next);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <NewDeviceDialog
      alert={secured ? null : alert}
      secured={secured}
      busy={confirm.isPending ? 'confirm' : secure.isPending ? 'secure' : null}
      error={confirm.isError || secure.isError ? 'We couldn’t save your answer. Try again.' : null}
      onConfirm={(id) => confirm.mutate(id)}
      onSecure={(id) => secure.mutate(id)}
      onLater={later}
      onCloseSecured={() => setSecured(null)}
    />
  );
}

/** AUTH-21 new-device login alert (split dialog / bottom sheet). Presentational — the host wires the API. */
export function NewDeviceDialog({
  alert,
  secured,
  busy,
  error,
  onConfirm,
  onSecure,
  onLater,
  onCloseSecured,
}: {
  alert: NewDeviceAlert | null;
  secured: { count: number } | null;
  busy: 'confirm' | 'secure' | null;
  error: string | null;
  onConfirm: (sessionId: string) => void;
  onSecure: (sessionId: string) => void;
  onLater: () => void;
  onCloseSecured: () => void;
}) {
  const auth = useAuth();
  const email = auth.profile?.emailMasked ?? null;
  const code = auth.profile?.security.antiPhishingCode ?? null;
  const open = alert !== null || secured !== null;
  return (
    <AuthModal
      open={open}
      onOpenChange={(o) => !o && (secured ? onCloseSecured() : onLater())}
      title={secured ? 'Your account is secured' : 'Was this you?'}
      size="split"
    >
      <SplitLayout
        panel={
          <SecurityPanel
            overline="Security alert"
            overlineIcon={ShieldAlert}
            tone="warning"
            title="We noticed a sign-in we haven’t seen before"
            sub="We show this on your other signed-in devices so you can react within minutes."
            art={
              <SecurityArt accent="bg-status-warning">
                <div className="absolute top-5 left-8 w-[250px] -rotate-[5deg] rounded-lg border border-border-default bg-surface-raised p-4 shadow-elevation-2">
                  <p className="flex items-center gap-2 text-label-m text-text-primary">
                    <Mail aria-hidden className="size-4 text-icon-brand" /> New sign-in alert
                  </p>
                  <p className="mt-2 text-caption text-text-tertiary">
                    {alert ? `${alert.device} · ${formatUtcDateTime(alert.signedInAt)}` : 'Signed out everywhere else'}
                  </p>
                  {code && (
                    <span className="mt-3 inline-flex rounded-sm bg-brand-tint px-2 py-0.5 font-mono text-mono-s text-text-brand">{code}</span>
                  )}
                </div>
              </SecurityArt>
            }
          >
            {email && (
              <Point icon={Mail} title={`We also email ${email} about new sign-ins`}>
                {code ? `Real emails show your anti-phishing code ${code}. No code — it isn’t from us.` : 'Set an anti-phishing code in Security settings to spot fake emails.'}
              </Point>
            )}
            <Point icon={ShieldCheck} title="Answering is safe">
              Neither answer moves funds, cancels entries or changes your limits.
            </Point>
          </SecurityPanel>
        }
      >
        {secured ? (
          <Pane onClose={onCloseSecured}>
            <PaneHeader icon={CircleCheck} tone="success" overline="Account secured" title="We signed out every other session">
              {secured.count === 1 ? '1 session was' : `${secured.count} sessions were`} signed out. This device stays
              signed in.
            </PaneHeader>
            <ol className="flex flex-col gap-4">
              <NumStep n={1} state="done" title="Other devices signed out">They need your email code or wallet again.</NumStep>
              <NumStep n={2} state="now" title="Secure your sign-in email or wallet">
                Change your email password, or move funds out of a wallet you no longer trust. Your 2FA stays on.
              </NumStep>
              <NumStep n={3} state="next" title="Check your whitelisted addresses">Remove any you don’t recognise.</NumStep>
            </ol>
            <div className="flex flex-col-reverse gap-3 border-t border-border-subtle pt-5 tablet:flex-row">
              <Button variant="ghost" size="l" block onClick={onCloseSecured}>
                Done
              </Button>
              <Button asChild size="l" block onClick={onCloseSecured}>
                <Link href={ROUTES.wallet}>Review withdrawal addresses</Link>
              </Button>
            </div>
          </Pane>
        ) : alert ? (
          <Pane onClose={onLater} closeLabel="Decide later">
            <PaneHeader icon={ShieldAlert} tone="warning" overline="New device · needs your answer" title="Was this you?">
              Someone signed in to your account from a device we haven’t seen before.
            </PaneHeader>
            <KeyValueBox title="Sign-in details">
              <KeyValue label="Device" value={alert.device} />
              <KeyValue label="Location" value={alert.location ?? 'Not available'} />
              <KeyValue label="IP address" value={alert.ipMasked ?? '—'} mono demo={alert.isDemo} />
              <KeyValue label="When" value={formatUtcDateTime(alert.signedInAt)} last />
            </KeyValueBox>
            <Note icon={Info}>
              Location is estimated from the IP address and can be off by tens of kilometres — mobile and office
              networks often show another city.
            </Note>
            <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-raised p-4">
              <p className="text-label-m text-text-primary">“Secure my account” will:</p>
              <ol className="flex flex-col gap-3">
                <NumStep n={1} state="next" title={`Sign out ${alert.device} right away`}>
                  and every other session except this one
                </NumStep>
                <NumStep n={2} state="next" title="Help you secure your sign-in email or wallet">
                  your 2FA stays on
                </NumStep>
                <NumStep n={3} state="next" title="Show your whitelisted addresses to check">
                  you can remove any you don’t recognise
                </NumStep>
              </ol>
            </div>
            {error && (
              <Callout tone="danger" title="That didn’t work">
                {error}
              </Callout>
            )}
            <div className="flex flex-col gap-2.5 border-t border-border-subtle pt-5">
              <Button
                variant="secondary"
                size="l"
                block
                leadingIcon={<Check />}
                loading={busy === 'confirm'}
                disabled={busy !== null}
                onClick={() => onConfirm(alert.sessionId)}
              >
                Yes, it was me
              </Button>
              <Button
                variant="danger"
                size="l"
                block
                leadingIcon={<Lock />}
                loading={busy === 'secure'}
                disabled={busy !== null}
                onClick={() => onSecure(alert.sessionId)}
              >
                No, secure my account
              </Button>
            </div>
            <Note icon={Info}>Not sure? Choose “No” — you can always sign in again on that device.</Note>
          </Pane>
        ) : null}
      </SplitLayout>
    </AuthModal>
  );
}
