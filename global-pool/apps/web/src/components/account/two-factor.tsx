'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpFromLine,
  CircleCheck,
  CircleHelp,
  Copy,
  Download,
  Info,
  KeyRound,
  LockOpen,
  LogIn,
  Mail,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ShieldPlus,
  Smartphone,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { useStepUp } from '@/components/auth/step-up';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckboxField } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/sonner';
import { accountApi, accountKeys, useSecurity, useTwoFactor } from '@/lib/api/account';
import { cn } from '@/lib/utils';

import { ACCOUNT_ROUTES } from './nav';
import { DashboardPage } from './page-shell';
import {
  CardSkeleton,
  CheckLine,
  Demo,
  IconTile,
  NoteBox,
  QueryState,
  SettingRow,
  ToneChip,
  utc,
} from './primitives';

const SETUP_HREF = `/2fa/setup?next=${encodeURIComponent(ACCOUNT_ROUTES.twoFactor)}`;

const WHERE = [
  { icon: LogIn, text: 'Sign-in from a new device or browser' },
  { icon: ArrowUpFromLine, text: 'Every withdrawal, whatever the amount' },
  { icon: ShieldCheck, text: 'Adding or removing a whitelisted address' },
  { icon: Mail, text: 'Changing your anti-phishing code' },
  { icon: KeyRound, text: 'Regenerating backup codes' },
  { icon: LockOpen, text: 'Turning 2FA off or moving it to a new phone' },
];

/** USR-A3 Two-factor authentication: manage (on), enable (off → AUTH-07 setup), disable / reset with step-up 2FA. */
export function TwoFactorPage() {
  const status = useTwoFactor();
  const security = useSecurity();
  const { requestStepUp } = useStepUp();
  const router = useRouter();
  const qc = useQueryClient();
  const [codes, setCodes] = React.useState<string[] | null>(null);
  const [confirmOff, setConfirmOff] = React.useState(false);

  const disable = useMutation({
    mutationFn: (token: string) => accountApi.disable2fa(token),
    onSettled: () => qc.invalidateQueries({ queryKey: accountKeys.all }),
  });
  const regenerate = useMutation({
    mutationFn: (token: string) => accountApi.regenerateBackupCodes(token),
    onSuccess: (r) => setCodes(r.backupCodes),
    onError: (e) =>
      toast({ type: 'error', title: 'No new codes generated', description: e.message }),
    onSettled: () => qc.invalidateQueries({ queryKey: accountKeys.all }),
  });

  const turnOff = async (thenSetup: boolean) => {
    const t = await requestStepUp({
      purpose: 'security_settings',
      title: thenSetup ? 'Move 2FA to a new phone' : 'Turn off two-factor authentication',
      description: thenSetup
        ? 'Confirm with a code from your current authenticator — or a backup code if you lost the phone. Then scan a new code on the new phone.'
        : 'Confirm with a code from your authenticator app or a backup code.',
      confirmLabel: thenSetup ? 'Continue' : 'Turn off 2FA',
    });
    if (!t) return;
    try {
      await disable.mutateAsync(t.stepUpToken);
      setConfirmOff(false);
      if (thenSetup) router.push(SETUP_HREF);
      else
        toast({
          type: 'warning',
          title: '2FA is off',
          description: 'Withdrawals and security changes pause until you turn it back on.',
        });
    } catch (e) {
      toast({
        type: 'error',
        title: 'Nothing changed',
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const newCodes = async () => {
    const t = await requestStepUp({
      purpose: 'security_settings',
      title: 'Generate new backup codes',
      description: 'Your old codes stop working as soon as the new ones are created.',
      confirmLabel: 'Generate codes',
    });
    if (t) regenerate.mutate(t.stepUpToken);
  };

  const s = status.data;
  const score = security.data?.score;
  const events = (security.data?.events ?? []).filter((e) =>
    /2fa|withdrawal|backup|anti_phishing/.test(e.action),
  );
  const remaining = s?.backupCodesRemaining ?? 0;

  return (
    <DashboardPage
      tab="account"
      accountTab="2fa"
      crumbs={[
        { label: 'Dashboard', href: ACCOUNT_ROUTES.dashboard },
        { label: 'Account & security', href: ACCOUNT_ROUTES.profile },
        { label: 'Two-factor authentication' },
      ]}
      title="Two-factor authentication"
      description="A 6-digit code from your authenticator app protects sign-ins on new devices, every withdrawal and every security change. We don’t offer SMS codes — SIM-swap attacks make them unsafe."
    >
      <QueryState query={status} label="your 2FA settings" skeleton={<CardSkeleton rows={4} />}>
        {s && (
          <>
            <Card className="flex-col gap-4 tablet:flex-row tablet:items-center">
              <IconTile icon={ShieldCheck} tone={s.enabled ? 'success' : 'warning'} />
              <div className="flex-1">
                <p className="flex flex-wrap items-center gap-2 text-body-m-strong">
                  Two-factor authentication
                  <ToneChip
                    tone={s.enabled ? 'success' : 'warning'}
                    icon={s.enabled ? CircleCheck : TriangleAlert}
                  >
                    {s.enabled ? 'On' : 'Off'}
                  </ToneChip>
                </p>
                <p className="text-body-s text-text-secondary">
                  {s.enabled
                    ? `Authenticator app · ${remaining} of 10 backup codes left`
                    : 'You need it before your first withdrawal or a sign-in from a new device. Setting it up takes about 2 minutes and doesn’t affect your balance.'}
                </p>
              </div>
              {s.enabled ? (
                <Button variant="secondary" size="m" asChild>
                  <a href="#method">Manage</a>
                </Button>
              ) : (
                <Button size="m" leadingIcon={<ShieldPlus aria-hidden />} asChild>
                  <Link href={SETUP_HREF}>Set up 2FA</Link>
                </Button>
              )}
            </Card>

            <div className="grid items-start gap-6 laptop:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <div className="flex flex-col gap-6">
                {s.enabled ? (
                  <Card id="method" padding="l" className="gap-1">
                    <div className="mb-2">
                      <h2 className="text-h5">Your method</h2>
                      <p className="text-body-s text-text-secondary">
                        One authenticator at a time. Moving to a new phone asks for a code from the
                        old one (or a backup code).
                      </p>
                    </div>
                    <SettingRow
                      first
                      icon={Smartphone}
                      tone="success"
                      title="Authenticator app (TOTP)"
                      detail="Codes work offline and change every 30 seconds."
                    >
                      <Button
                        variant="secondary"
                        size="s"
                        leadingIcon={<RefreshCw aria-hidden />}
                        onClick={() => void turnOff(true)}
                      >
                        Move to a new phone
                      </Button>
                    </SettingRow>
                    <SettingRow
                      icon={Mail}
                      title="Email code (sign-in only)"
                      detail="Used by your sign-in method. Never accepted for withdrawals or security changes."
                    >
                      <span className="inline-flex items-center gap-1 text-label-m text-text-success">
                        <CircleCheck aria-hidden className="size-4" /> On
                      </span>
                    </SettingRow>
                  </Card>
                ) : (
                  <Card padding="l" className="gap-4">
                    <h2 className="text-h5">Turn on 2FA in 3 steps</h2>
                    <ol className="grid gap-3 tablet:grid-cols-3">
                      {[
                        [
                          'Get an authenticator app',
                          'Any app with time-based 6-digit codes (TOTP). Codes work offline.',
                        ],
                        ['Scan the QR code', 'Can’t scan? Enter the setup key by hand.'],
                        [
                          'Enter the 6-digit code',
                          'Then save your 10 single-use backup codes offline.',
                        ],
                      ].map(([t, b], i) => (
                        <li
                          key={t}
                          className="flex flex-col gap-2 rounded-md bg-surface-raised p-4"
                        >
                          <span className="flex size-7 items-center justify-center rounded-full bg-brand-tint text-label-m text-text-brand">
                            {i + 1}
                          </span>
                          <span className="text-label-l">{t}</span>
                          <span className="text-body-s text-text-secondary">{b}</span>
                        </li>
                      ))}
                    </ol>
                    <Button
                      size="l"
                      className="self-start"
                      leadingIcon={<ShieldPlus aria-hidden />}
                      asChild
                    >
                      <Link href={SETUP_HREF}>Start setup</Link>
                    </Button>
                  </Card>
                )}

                <Card padding="l" className="gap-4">
                  <div>
                    <h2 className="text-h5">Where we ask for a code</h2>
                    <p className="text-body-s text-text-secondary">
                      These checks can’t be switched off while 2FA is on. Protective actions —
                      revoking a device, ending sessions, self-exclusion — never need a code.
                    </p>
                  </div>
                  <ul className="grid gap-3 tablet:grid-cols-2">
                    {WHERE.map(({ icon: Icon, text }) => (
                      <li
                        key={text}
                        className="flex items-center gap-3 rounded-md bg-surface-raised p-4 text-body-s"
                      >
                        <Icon aria-hidden className="size-4 shrink-0 text-icon-brand" />
                        <span className="flex-1">{text}</span>
                        <CircleCheck
                          aria-label={s.enabled ? 'Active' : 'Active once 2FA is on'}
                          className={cn(
                            'size-4',
                            s.enabled ? 'text-text-success' : 'text-icon-muted',
                          )}
                        />
                      </li>
                    ))}
                  </ul>
                </Card>

                {s.enabled && (
                  <Card padding="l" className="gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-h5">Backup codes</h2>
                        <p className="text-body-s text-text-secondary">
                          Each code works once if you lose your phone. Store them offline — never in
                          screenshots or chat.
                        </p>
                      </div>
                      <ToneChip
                        tone={remaining > 0 ? 'success' : 'warning'}
                        icon={remaining > 0 ? CircleCheck : TriangleAlert}
                      >
                        {remaining > 0 ? 'Available' : 'None left'}
                      </ToneChip>
                    </div>
                    <p className="flex items-baseline gap-2">
                      <span className="text-number-xl tabular-nums">{remaining}</span>
                      <span className="text-body-s text-text-secondary">of 10 unused</span>
                    </p>
                    <ul
                      className="grid grid-cols-2 gap-2 tablet:grid-cols-5"
                      aria-label="Backup code slots"
                    >
                      {Array.from({ length: 10 }, (_, i) => (
                        <li
                          key={i}
                          className={cn(
                            'flex h-10 items-center justify-center rounded-md border font-mono text-mono-s',
                            i < remaining
                              ? 'border-border-subtle bg-bg-secondary text-text-tertiary'
                              : 'border-transparent bg-surface-raised text-text-disabled line-through',
                          )}
                        >
                          {i < remaining ? '••••-••••' : 'used'}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center">
                      <Button
                        variant="secondary"
                        size="m"
                        leadingIcon={<RotateCcw aria-hidden />}
                        loading={regenerate.isPending}
                        onClick={() => void newCodes()}
                      >
                        Generate new codes
                      </Button>
                      <p className="text-caption text-text-tertiary">
                        Codes are stored only as hashes, so we can’t show old ones again. Generating
                        new codes cancels all old ones and needs a 2FA code.
                      </p>
                    </div>
                  </Card>
                )}
              </div>

              <aside className="flex flex-col gap-6" aria-label="Recovery and help">
                {s.enabled && (
                  <>
                    <Card padding="l" className="gap-3">
                      <h2 className="flex items-center gap-3 text-h5">
                        <IconTile icon={CircleHelp} tone="info" size={36} /> Lost your phone?
                      </h2>
                      <p className="text-body-s text-text-secondary">
                        {remaining > 0
                          ? `Use one of your ${remaining} backup codes to move 2FA to a new phone. `
                          : 'You have no backup codes left — generate new ones while you still have your phone. '}
                        Lost the phone and every code? Contact support — we verify you against your
                        KYC documents before any reset.
                      </p>
                      <Button
                        variant="secondary"
                        size="m"
                        block
                        leadingIcon={<RotateCcw aria-hidden />}
                        onClick={() => void turnOff(true)}
                      >
                        Reset 2FA
                      </Button>
                    </Card>
                    <Card padding="l" className="gap-3 border-border-danger">
                      <h2 className="flex items-center gap-3 text-h5">
                        <IconTile icon={TriangleAlert} tone="danger" size={36} /> Turn off 2FA
                      </h2>
                      <ul className="flex flex-col gap-2 text-body-s text-text-secondary">
                        <li>— Withdrawals and whitelist changes pause until you turn it back on</li>
                        {score !== undefined && (
                          <li>
                            — Security score drops from {score} to{' '}
                            {Math.max(0, score - 30 - (remaining > 0 ? 10 : 0))}
                          </li>
                        )}
                        <li>— New sign-ins rely on your email code only</li>
                      </ul>
                      <Button
                        variant="danger"
                        size="m"
                        block
                        leadingIcon={<LockOpen aria-hidden />}
                        onClick={() => setConfirmOff(true)}
                      >
                        Turn off 2FA
                      </Button>
                    </Card>
                  </>
                )}
                <NoteBox tone="info" icon={Info}>
                  Any app that supports time-based 6-digit codes works. We never send 2FA codes by
                  SMS and never ask you to read one out.
                </NoteBox>
                <Card padding="l" className="gap-3">
                  <h2 className="text-h5">Recent 2FA activity</h2>
                  {events.length === 0 ? (
                    <p className="text-body-s text-text-tertiary">No 2FA activity yet.</p>
                  ) : (
                    <ul className="flex flex-col">
                      {events.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-start gap-3 border-t border-border-subtle py-3 first:border-t-0"
                        >
                          <IconTile
                            icon={e.tone === 'warning' ? TriangleAlert : CircleCheck}
                            tone={e.tone}
                            size={32}
                          />
                          <div className="min-w-0">
                            <p className="text-body-s-strong">{e.label}</p>
                            <p className="text-caption text-text-tertiary">{utc(e.at)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </aside>
            </div>
          </>
        )}
      </QueryState>

      <TurnOffDialog
        open={confirmOff}
        onOpenChange={setConfirmOff}
        onConfirm={() => void turnOff(false)}
        busy={disable.isPending}
      />
      <BackupCodesDialog codes={codes} onClose={() => setCodes(null)} />
    </DashboardPage>
  );
}

function TurnOffDialog({
  open,
  onOpenChange,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const [ack, setAck] = React.useState(false);
  React.useEffect(() => {
    if (!open) setAck(false);
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="s">
        <DialogHeader>
          <DialogTitle>Turn off two-factor authentication?</DialogTitle>
          <DialogDescription>
            Your account becomes easier to take over. Your balance is not affected.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-3">
          <CheckLine ok="warn">
            Withdrawals and whitelist changes pause until you turn 2FA back on.
          </CheckLine>
          <CheckLine ok="warn">Your backup codes stop working.</CheckLine>
          <CheckLine ok="info">
            We email you to confirm the change, with your anti-phishing code.
          </CheckLine>
          <CheckboxField
            checked={ack}
            onCheckedChange={(v) => setAck(v === true)}
            label="I understand my account will be less protected"
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" size="m" onClick={() => onOpenChange(false)}>
            Keep 2FA on
          </Button>
          <Button variant="danger" size="m" disabled={!ack} loading={busy} onClick={onConfirm}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Shown once after regeneration: codes are only ever returned by this response. */
function BackupCodesDialog({ codes, onClose }: { codes: string[] | null; onClose: () => void }) {
  const [saved, setSaved] = React.useState(false);
  React.useEffect(() => setSaved(false), [codes]);
  const text = codes?.join('\n') ?? '';
  const download = () => {
    const blob = new Blob([`GLOBAL POOL backup codes (each works once)\n\n${text}\n`], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'globalpool-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Dialog open={codes !== null} onOpenChange={(o) => !o && saved && onClose()}>
      <DialogContent size="m" showClose={false}>
        <DialogHeader>
          <DialogTitle>Your new backup codes</DialogTitle>
          <DialogDescription>
            We show them only once. Store them offline — each code works once. Your old codes no
            longer work.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <ul className="grid grid-cols-2 gap-2">
            {codes?.map((c) => (
              <li
                key={c}
                className="rounded-md bg-bg-secondary px-3 py-2 text-center font-mono text-mono-m"
              >
                {c}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="m"
              leadingIcon={<Download aria-hidden />}
              onClick={download}
            >
              Download .txt
            </Button>
            <Button
              variant="secondary"
              size="m"
              leadingIcon={<Copy aria-hidden />}
              onClick={() =>
                void navigator.clipboard
                  ?.writeText(text)
                  .then(() => toast({ type: 'success', title: 'Copied' }))
              }
            >
              Copy all
            </Button>
            <Demo className="self-center" />
          </div>
          <CheckboxField
            checked={saved}
            onCheckedChange={(v) => setSaved(v === true)}
            label="I’ve saved my backup codes"
          />
        </DialogBody>
        <DialogFooter>
          <Button size="m" disabled={!saved} onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
