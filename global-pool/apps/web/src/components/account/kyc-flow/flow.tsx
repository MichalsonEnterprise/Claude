'use client';

import { formatUSDT } from '@gp/shared/money';
import type { KycCheck, KycDetailsInput, KycDocumentSide } from '@gp/shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CircleCheck,
  CircleHelp,
  Clock,
  FlaskConical,
  Hourglass,
  IdCard,
  Lock,
  Shield,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Logo } from '@/components/brand/logo';
import { ROUTES } from '@/components/shell/nav-config';
import { AgeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import {
  accountApi,
  accountKeys,
  useKyc,
  useMe,
  type KycApplicationView,
  type KycView,
} from '@/lib/api/account';
import { ApiRequestError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/context';
import { publicEnv } from '@/lib/env';
import { cn } from '@/lib/utils';

import { DOC_LABEL, LEVEL_INFO } from '../kyc-status';
import { ACCOUNT_ROUTES } from '../nav';
import { CheckLine, Demo, NoteBox, ToneChip, utc } from '../primitives';
import { KycArt } from './art';
import { DetailsStep, DocumentStep, LivenessStep, type UploadInput } from './steps';

const STEPS = ['Intro', 'Details', 'Document', 'Liveness', 'Review'] as const;
type View =
  | 'intro'
  | 'details'
  | 'document'
  | 'liveness'
  | 'review'
  | 'pending'
  | 'approved'
  | 'resubmit'
  | 'reasons'
  | 'done';

function nextLevel(k: KycView): 'level_1' | 'level_2' | 'level_3' | null {
  return k.currentLevel === 'none'
    ? 'level_1'
    : k.currentLevel === 'level_1'
      ? 'level_2'
      : k.currentLevel === 'level_2'
        ? 'level_3'
        : null;
}

function levelNo(l: string) {
  return l === 'none' ? '0' : l.slice(-1);
}

/** Which view an application is in (server state → screen). */
function viewFor(k: KycView, local: View | null): View {
  const app = k.application;
  const open =
    app && ['not_started', 'pending', 'in_review', 'resubmission_required'].includes(app.status);
  if (local) return local;
  if (!open) {
    return nextLevel(k) ? 'intro' : 'done';
  }
  if (app.status === 'in_review' || app.status === 'pending') return 'pending';
  if (app.status === 'resubmission_required') return 'reasons';
  return app.step === 'review'
    ? 'review'
    : app.step === 'details'
      ? 'details'
      : app.step === 'document'
        ? 'document'
        : app.step === 'liveness'
          ? 'liveness'
          : 'intro';
}

/**
 * AUTH-11…17 KYC flow: a two-pane dialog (context panel + 5-step wizard) over the KYC status page; full screen on
 * mobile. Every step is saved server-side (resume on any device). Mock provider: DEMO decision controls on the
 * pending screen simulate the compliance outcome.
 */
export function KycFlowDialog() {
  const router = useRouter();
  const auth = useAuth();
  const kyc = useKyc();
  const me = useMe();
  const qc = useQueryClient();
  const [local, setLocal] = React.useState<View | null>(null);
  const [uploading, setUploading] = React.useState<KycDocumentSide | null>(null);
  /** The step on screen; uploads / captures pin it so the player stays until they press Continue. */
  const viewRef = React.useRef<View>('intro');
  const pin = () => setLocal((l) => l ?? viewRef.current);
  const [ack, setAck] = React.useState(false);
  const close = () => router.push(ACCOUNT_ROUTES.kyc);

  const setData = (data: KycView) => {
    qc.setQueryData(accountKeys.kyc(), data);
    void qc.invalidateQueries({ queryKey: accountKeys.me() });
    void qc.invalidateQueries({ queryKey: accountKeys.kycDocuments() });
  };
  const onError = (e: Error) =>
    toast({
      type: 'error',
      title: 'Not saved',
      description:
        e instanceof ApiRequestError ? e.message : 'Check your connection and try again.',
    });

  const start = useMutation({
    mutationFn: accountApi.kycStart,
    onSuccess: (d) => {
      setData(d);
      setLocal(null);
    },
    onError,
  });
  const details = useMutation({
    mutationFn: accountApi.kycDetails,
    onSuccess: (d) => {
      setData(d);
      setLocal(null);
    },
  });
  const submit = useMutation({
    mutationFn: accountApi.kycSubmit,
    onSuccess: (d) => {
      setData(d);
      setLocal(d.application?.status === 'verified' ? 'approved' : null);
      setAck(false);
    },
    onError,
  });
  const decide = useMutation({
    mutationFn: async (d: {
      approve: boolean;
      level: KycApplicationView['level'];
      reasons?: KycCheck[];
    }) => {
      if (d.approve) await accountApi.devKycApprove(d.level);
      else await accountApi.devKycReject(d.level, d.reasons ?? ['image_quality']);
      return accountApi.kyc();
    },
    onSuccess: (d) => {
      setData(d);
      setLocal(d.application?.status === 'verified' ? 'approved' : null);
    },
    onError,
  });

  const upload = async (u: UploadInput) => {
    setUploading(u.side);
    try {
      const r = await accountApi.kycDocument({
        documentType: u.documentType,
        side: u.side,
        issuingCountry: u.issuingCountry,
        fileName: u.file.name.slice(0, 160),
        mimeType: u.file.type as 'image/jpeg',
        sizeBytes: u.file.size,
        sha256: u.sha256,
      });
      pin();
      setData(r);
      if (r.document.status === 'rejected')
        toast({
          type: 'warning',
          title: 'This photo needs a retake',
          description: 'It didn’t pass the quality check.',
        });
    } catch (e) {
      onError(e as Error);
    } finally {
      setUploading(null);
    }
  };
  const capture = async (durationMs: number) => {
    try {
      const d = await accountApi.kycLiveness(durationMs);
      pin();
      setData(d);
    } catch (e) {
      onError(e as Error);
    }
  };

  const k = kyc.data;
  const app = k?.application ?? null;
  const view: View = k ? viewFor(k, local) : 'intro';
  viewRef.current = view;
  const level =
    app && view !== 'intro' && view !== 'done'
      ? app.level
      : k
        ? (nextLevel(k) ?? 'level_3')
        : 'level_2';
  const isL3 = level === 'level_3';
  const steps = isL3
    ? (['Intro', 'Document', 'Review'] as const)
    : level === 'level_1'
      ? (['Intro', 'Details', 'Review'] as const)
      : STEPS;
  const stepLabel: Record<View, string> = {
    intro: 'Intro',
    details: 'Details',
    document: 'Document',
    liveness: 'Liveness',
    review: 'Review',
    pending: 'Review',
    approved: 'Review',
    resubmit: 'Document',
    reasons: 'Review',
    done: 'Review',
  };
  const current = Math.max(0, (steps as readonly string[]).indexOf(stepLabel[view]));
  const done = view === 'approved' || view === 'done';
  const demo = publicEnv.demoMode;
  const accountCountry = me.data?.country?.code ?? null;

  const goNextFromDocument = () => setLocal(isL3 ? 'review' : 'liveness');
  const back = () => {
    const order: View[] = isL3
      ? ['intro', 'document', 'review']
      : level === 'level_1'
        ? ['intro', 'details', 'review']
        : ['intro', 'details', 'document', 'liveness', 'review'];
    const i = order.indexOf(view === 'resubmit' ? 'document' : view);
    if (i > 0) setLocal(order[i - 1]!);
  };

  const panel =
    PANEL[
      view === 'resubmit' || view === 'reasons'
        ? 'resubmit'
        : view === 'pending'
          ? 'pending'
          : view === 'approved' || view === 'done'
            ? 'approved'
            : view === 'liveness'
              ? 'liveness'
              : view === 'details'
                ? 'details'
                : 'intro'
    ];

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent
        showClose={false}
        className="max-w-[1080px] max-tablet:top-0 max-tablet:left-0 max-tablet:h-dvh max-tablet:max-h-dvh max-tablet:w-full max-tablet:translate-x-0 max-tablet:translate-y-0 max-tablet:rounded-none max-tablet:border-0"
        aria-describedby="kyc-flow-desc"
      >
        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-[340px] shrink-0 flex-col border-r border-border-subtle bg-bg-secondary laptop:flex">
            <div className="flex flex-col gap-3 p-8 pb-4">
              <Logo height={30} title="GLOBAL POOL" />
              <p className="mt-4 text-overline uppercase text-text-brand">
                Level {levelNo(level)} verification
              </p>
              <p className="text-h4">{panel.title(level, k)}</p>
              <p className="text-body-s text-text-secondary">{panel.body(level, k)}</p>
            </div>
            <KycArt variant={panel.art} />
            <ul className="flex flex-col gap-4 p-8 pt-6">
              {[
                [ShieldCheck, 'Checked against your ID document — never your credit file'],
                [UserCheck, 'A specialist reviews it if the automated check is unsure'],
                [Smartphone, 'Progress is saved — finish on any device'],
              ].map(([Icon, t]) => {
                const I = Icon as typeof ShieldCheck;
                return (
                  <li key={t as string} className="flex gap-3 text-body-s text-text-secondary">
                    <I aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-brand" />{' '}
                    {t as string}
                  </li>
                );
              })}
            </ul>
            <div className="mt-auto flex flex-col gap-3 border-t border-border-subtle p-6">
              <p className="flex gap-2 text-caption text-text-tertiary">
                <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" /> Encrypted in transit and
                at rest. Used only for identity verification and AML checks.
              </p>
              <p className="flex items-center gap-2 text-caption text-text-tertiary">
                <AgeBadge /> Licence required · Permitted regions only
              </p>
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center gap-3 border-b border-border-subtle px-5 py-4 tablet:px-8">
              <DialogTitle className="text-h5 tablet:text-h4">
                <span className="tablet:hidden">Verification</span>
                <span className="hidden tablet:inline">Identity verification</span>
              </DialogTitle>
              {k && (
                <ToneChip
                  tone={k.currentLevel === 'none' ? 'neutral' : 'success'}
                  icon={ShieldCheck}
                >
                  KYC L{levelNo(k.currentLevel)}
                  {k.currentLevel === 'none' ? ' · Not verified' : ' · Approved'}
                </ToneChip>
              )}
              <Link
                href={ROUTES.support}
                className="ml-auto hidden min-h-11 items-center gap-1.5 text-label-m text-text-secondary hover:text-text-primary tablet:inline-flex"
              >
                <CircleHelp aria-hidden className="size-4" /> Help
              </Link>
              <Button
                variant="ghost"
                size="m"
                className="size-11 px-0 max-tablet:ml-auto"
                aria-label="Close verification"
                onClick={close}
              >
                ✕
              </Button>
            </header>
            <DialogDescription id="kyc-flow-desc" className="sr-only">
              Identity verification in {steps.length} steps. Your progress is saved after every
              step.
            </DialogDescription>

            {!done && (
              <ol aria-label="Progress" className="flex items-center gap-2 px-5 pt-5 tablet:px-8">
                {steps.map((s, i) => {
                  const state = i < current ? 'done' : i === current ? 'now' : 'next';
                  return (
                    <li
                      key={s}
                      className="flex flex-1 flex-col items-center gap-1.5"
                      aria-current={state === 'now' ? 'step' : undefined}
                    >
                      <div className="flex w-full items-center gap-2">
                        <span
                          className={cn(
                            'h-px flex-1',
                            i === 0 ? 'opacity-0' : i <= current ? 'bg-brand' : 'bg-border-default',
                          )}
                        />
                        <span
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-full border text-label-m',
                            state === 'done' && 'border-brand bg-brand text-text-on-primary',
                            state === 'now' && 'border-brand bg-brand-tint text-text-brand',
                            state === 'next' && 'border-border-default text-text-tertiary',
                          )}
                        >
                          {state === 'done' ? (
                            <CircleCheck aria-label="Done" className="size-4" />
                          ) : (
                            i + 1
                          )}
                        </span>
                        <span
                          className={cn(
                            'h-px flex-1',
                            i === steps.length - 1
                              ? 'opacity-0'
                              : i < current
                                ? 'bg-brand'
                                : 'bg-border-default',
                          )}
                        />
                      </div>
                      <span
                        className={cn(
                          'hidden text-caption tablet:block',
                          state === 'next' ? 'text-text-tertiary' : 'text-text-primary',
                        )}
                      >
                        {s}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 tablet:px-8">
              {/* ERR-03: skeleton only while the KYC status loads — guests get a sign-in prompt, failures an
                  error with Try again (never an endless skeleton). */}
              {!k && auth.status === 'guest' ? (
                <EmptyState
                  title="Sign in to verify your identity"
                  description="Verification is saved to your account, so you can resume on any device."
                  actions={
                    <Button
                      onClick={() =>
                        auth.openAuth?.('sign-in', { next: ACCOUNT_ROUTES.kycVerify }) ??
                        auth.signIn()
                      }
                    >
                      Sign in
                    </Button>
                  }
                />
              ) : !k && kyc.isError ? (
                <ErrorState
                  error={kyc.error}
                  onRetry={() => void kyc.refetch()}
                  retrying={kyc.isFetching}
                  what="your verification"
                  note="Nothing you saved is lost."
                />
              ) : !k ? (
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-8 w-2/3" />
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : view === 'intro' ? (
                <Intro k={k} level={level} />
              ) : view === 'done' ? (
                <Approved k={k} app={app} />
              ) : view === 'details' && app ? (
                <>
                  <StepTitle
                    title="Confirm your personal details"
                    sub="Enter them exactly as they appear on your ID document. You can change them until you submit."
                  />
                  <DetailsStep
                    app={app}
                    accountCountry={accountCountry}
                    formId="kyc-details-form"
                    busy={details.isPending}
                    serverError={details.error}
                    onSubmit={(v: KycDetailsInput) => details.mutate(v)}
                  />
                </>
              ) : view === 'reasons' && app ? (
                <ReasonsView app={app} />
              ) : (view === 'document' || view === 'resubmit') && app ? (
                <>
                  <StepTitle
                    title={
                      isL3
                        ? 'Upload your proof of address'
                        : view === 'resubmit'
                          ? 'Retake only what failed'
                          : 'Upload your identity document'
                    }
                    sub={
                      isL3
                        ? 'A utility bill, bank statement or tax letter from the last 3 months.'
                        : 'Choose a document, then add a clear colour photo of each side.'
                    }
                  />
                  <DocumentStep
                    app={app}
                    onUpload={upload}
                    uploading={uploading}
                    accountCountry={accountCountry}
                  />
                </>
              ) : view === 'liveness' && app ? (
                <>
                  <StepTitle
                    title="Record a short selfie video"
                    sub="We match it to the photo on your ID. It takes about 10 seconds."
                  />
                  <LivenessStep app={app} onCapture={capture} />
                </>
              ) : view === 'review' && app ? (
                <Review app={app} ack={ack} setAck={setAck} onEdit={setLocal} />
              ) : view === 'pending' && app ? (
                <Pending app={app} k={k} />
              ) : view === 'approved' ? (
                <Approved k={k} app={app} />
              ) : null}
            </div>

            <footer className="flex flex-wrap items-center gap-3 border-t border-border-subtle px-5 py-4 max-tablet:[&>button:last-child]:flex-1 max-tablet:[&>a:last-child]:flex-1 tablet:flex-nowrap tablet:px-8">
              {k && view === 'intro' && (
                <>
                  <Button variant="ghost" size="l" onClick={close}>
                    Not now
                  </Button>
                  <p className="hidden flex-1 text-caption text-text-tertiary tablet:block tablet:text-right">
                    {k.currentLevel === 'none'
                      ? 'Until you verify you can browse and try free demo games. Withdrawing your own funds is never blocked by this screen.'
                      : `On Level ${levelNo(k.currentLevel)} you can still deposit, play and withdraw up to ${formatUSDT(k.dailyLimit)} a day.`}
                  </p>
                  <Button
                    size="l"
                    trailingIcon={<ArrowRight aria-hidden />}
                    loading={start.isPending}
                    onClick={() => start.mutate(level)}
                  >
                    {app && app.status === 'not_started'
                      ? 'Continue'
                      : `Start Level ${levelNo(level)}`}
                  </Button>
                </>
              )}
              {view === 'reasons' && app && (
                <>
                  <Button variant="ghost" size="l" asChild>
                    <Link href={ROUTES.support}>Ask for a re-check</Link>
                  </Button>
                  <p className="hidden flex-1 text-caption text-text-tertiary tablet:block tablet:text-right">
                    {k
                      ? `Your Level ${levelNo(k.currentLevel)} limits stay active: up to ${formatUSDT(k.dailyLimit)} a day.`
                      : ''}
                  </p>
                  <Button
                    size="l"
                    trailingIcon={<ArrowRight aria-hidden />}
                    onClick={() =>
                      setLocal(
                        app.requirements.details
                          ? app.requirements.document
                            ? app.requirements.liveness
                              ? 'review'
                              : 'liveness'
                            : 'resubmit'
                          : 'details',
                      )
                    }
                  >
                    Fix and resubmit
                  </Button>
                </>
              )}
              {view === 'details' && (
                <>
                  <Button
                    variant="ghost"
                    size="l"
                    leadingIcon={<ArrowLeft aria-hidden />}
                    onClick={back}
                  >
                    Back
                  </Button>
                  <p className="hidden flex-1 text-caption text-text-tertiary tablet:block tablet:text-right">
                    We never run a credit check or share your details for marketing.
                  </p>
                  <Button
                    size="l"
                    type="submit"
                    form="kyc-details-form"
                    trailingIcon={<ArrowRight aria-hidden />}
                    loading={details.isPending}
                  >
                    Save and continue
                  </Button>
                </>
              )}
              {(view === 'document' || view === 'resubmit') && app && (
                <>
                  <Button
                    variant="ghost"
                    size="l"
                    leadingIcon={<ArrowLeft aria-hidden />}
                    onClick={back}
                  >
                    Back
                  </Button>
                  <p className="hidden flex-1 text-caption text-text-tertiary tablet:block tablet:text-right">
                    {app.requirements.document
                      ? 'Both sides passed our quality checks.'
                      : 'Add every side to continue — or switch to your phone camera.'}
                  </p>
                  <Button
                    size="l"
                    trailingIcon={<ArrowRight aria-hidden />}
                    disabled={!app.requirements.document}
                    onClick={() =>
                      view === 'resubmit' && app.requirements.liveness
                        ? setLocal('review')
                        : goNextFromDocument()
                    }
                  >
                    {level === 'level_2' && !(view === 'resubmit' && app.requirements.liveness)
                      ? 'Continue to selfie'
                      : 'Continue'}
                  </Button>
                </>
              )}
              {view === 'liveness' && app && (
                <>
                  <Button
                    variant="ghost"
                    size="l"
                    leadingIcon={<ArrowLeft aria-hidden />}
                    onClick={back}
                  >
                    Back
                  </Button>
                  <p className="hidden flex-1 text-caption text-text-tertiary tablet:block tablet:text-right">
                    Attempt {Math.min(app.liveness.attempts + 1, app.liveness.maxAttempts)} of{' '}
                    {app.liveness.maxAttempts}
                  </p>
                  <Button
                    size="l"
                    trailingIcon={<ArrowRight aria-hidden />}
                    disabled={!app.requirements.liveness}
                    onClick={() => setLocal('review')}
                  >
                    Continue
                  </Button>
                </>
              )}
              {view === 'review' && app && (
                <>
                  <Button
                    variant="ghost"
                    size="l"
                    leadingIcon={<ArrowLeft aria-hidden />}
                    onClick={back}
                  >
                    Back
                  </Button>
                  <p className="hidden flex-1 text-caption text-text-tertiary tablet:block tablet:text-right">
                    Review usually takes under 10 minutes, up to 24 h.
                  </p>
                  <Button
                    size="l"
                    disabled={!ack || !app.canSubmit}
                    loading={submit.isPending}
                    onClick={() => submit.mutate()}
                  >
                    {app.status === 'resubmission_required' ? 'Submit again' : 'Submit for review'}
                  </Button>
                </>
              )}
              {view === 'pending' && app && (
                <>
                  {demo && (
                    <div className="flex flex-1 flex-wrap items-center gap-2 rounded-md border border-dashed border-border-gold p-2">
                      <FlaskConical aria-hidden className="size-4 text-text-gold" />
                      <span className="text-caption text-text-gold">
                        DEMO mock provider — simulate the decision:
                      </span>
                      <Button
                        size="s"
                        variant="secondary"
                        loading={decide.isPending}
                        onClick={() => decide.mutate({ approve: true, level: app.level })}
                      >
                        Approve
                      </Button>
                      <Button
                        size="s"
                        variant="ghost"
                        loading={decide.isPending}
                        onClick={() =>
                          decide.mutate({
                            approve: false,
                            level: app.level,
                            reasons: ['image_quality'],
                          })
                        }
                      >
                        Reject (blurry photo)
                      </Button>
                    </div>
                  )}
                  <Button size="l" className="tablet:ml-auto" onClick={close}>
                    Back to my account
                  </Button>
                </>
              )}
              {(view === 'approved' || view === 'done') && (
                <>
                  <Button variant="ghost" size="l" asChild>
                    <Link href={ROUTES.responsibleGaming}>Review my limits</Link>
                  </Button>
                  <div className="flex flex-col gap-3 tablet:ml-auto tablet:flex-row">
                    {k?.currentLevel === 'level_1' && (
                      <Button variant="secondary" size="l" onClick={() => setLocal('intro')}>
                        Continue to Level 2
                      </Button>
                    )}
                    <Button size="l" onClick={close}>
                      Done
                    </Button>
                  </div>
                </>
              )}
            </footer>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const PANEL: Record<
  'intro' | 'details' | 'liveness' | 'pending' | 'approved' | 'resubmit',
  {
    art: 'documents' | 'selfie' | 'review' | 'approved' | 'resubmit';
    title: (l: string, k?: KycView) => string;
    body: (l: string, k?: KycView) => string;
  }
> = {
  intro: {
    art: 'documents',
    title: (l) =>
      l === 'level_1'
        ? 'Unlock deposits in about 2 minutes'
        : l === 'level_3'
          ? 'Enhanced limits on request'
          : 'Higher limits in about 5 minutes',
    body: (l) =>
      l === 'level_1'
        ? 'Our licence requires basic details before any real-money activity. No documents needed for Level 1.'
        : l === 'level_3'
          ? 'Proof of address, reviewed by compliance within 3 business days.'
          : 'Our licence requires an ID check before daily limits go above 2,000.00 USDT. One document and one short selfie video.',
  },
  details: {
    art: 'documents',
    title: () => 'Step 2 of 5 · Details',
    body: () =>
      'Licensed operators must confirm who their players are. We match what you enter with your ID document automatically.',
  },
  liveness: {
    art: 'selfie',
    title: () => 'Step 4 of 5 · Liveness',
    body: () =>
      'A 10-second video proves it’s really you holding the document. Never shown to anyone outside compliance.',
  },
  pending: {
    art: 'review',
    title: () => 'We’re on it',
    body: () =>
      'Most reviews finish within 10 minutes. You can close this window — we notify you in the app.',
  },
  approved: {
    art: 'approved',
    title: () => 'You’re verified',
    body: () => 'Your new limits apply now. Your own responsible-gaming limits are unchanged.',
  },
  resubmit: {
    art: 'resubmit',
    title: () => 'Almost there',
    body: () =>
      'Only the failed items need redoing — everything else is kept, including your selfie video.',
  },
};

function StepTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-h3">{title}</h2>
      <p className="mt-1 text-body-m text-text-secondary">{sub}</p>
    </div>
  );
}

function Intro({ k, level }: { k: KycView; level: string }) {
  const rows: [string, (l: (typeof LEVEL_INFO)[number], lim: string) => string][] = [
    [
      'You provide',
      (l) =>
        l.level === 'level_1'
          ? 'Name, date of birth and address'
          : l.level === 'level_2'
            ? '+ ID document and 10-second selfie video'
            : '+ Proof of address and source of funds',
    ],
    ['Withdrawals per day', (_l, lim) => formatUSDT(lim)],
    [
      'Review time',
      (l) =>
        l.level === 'level_1'
          ? 'Instant'
          : l.level === 'level_2'
            ? 'Usually under 10 min, up to 24 h'
            : 'Up to 3 business days',
    ],
  ];
  return (
    <div className="flex flex-col gap-6">
      <StepTitle
        title="Verify your identity to raise your limits"
        sub={
          k.currentLevel === 'none'
            ? 'You’re not verified yet. Level 1 takes about 2 minutes: confirm your legal name, date of birth and address.'
            : `You’re on ${k.currentLabel}. Level ${levelNo(level)} takes about 5 minutes${level === 'level_2' ? ': confirm your details, upload one ID document and record a 10-second selfie video.' : '.'}`
        }
      />
      <div className="flex items-center gap-3">
        <h3 className="text-h5">Verification levels and daily limits</h3>
        <Demo size="m" className="ml-auto" />
      </div>
      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="w-full min-w-[560px] text-left text-body-s">
          <thead>
            <tr>
              <th scope="col" className="w-[150px] p-4" />
              {LEVEL_INFO.map((l) => {
                const lv = k.levels.find((x) => x.level === l.level);
                const next = l.level === level;
                return (
                  <th
                    key={l.level}
                    scope="col"
                    className={cn(
                      'border-l border-border-subtle p-4 align-top',
                      next && 'border-border-brand bg-surface-selected',
                    )}
                  >
                    <span
                      className={cn(
                        'block text-label-l',
                        next ? 'text-text-brand' : 'text-text-primary',
                      )}
                    >
                      Level {levelNo(l.level)} · {l.name}
                    </span>
                    <span className="mt-1 inline-block">
                      {lv?.reached ? (
                        <ToneChip tone="success" icon={CircleCheck}>
                          Completed
                        </ToneChip>
                      ) : next ? (
                        <ToneChip tone="brand" icon={ArrowRight}>
                          Next step
                        </ToneChip>
                      ) : (
                        <ToneChip tone="neutral" icon={Clock}>
                          {l.level === 'level_3' ? 'On request' : 'Later'}
                        </ToneChip>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, fn]) => (
              <tr key={label} className="border-t border-border-subtle">
                <th scope="row" className="p-4 text-label-m text-text-tertiary">
                  {label}
                </th>
                {LEVEL_INFO.map((l) => (
                  <td
                    key={l.level}
                    className={cn(
                      'border-l border-border-subtle p-4 text-text-secondary',
                      l.level === level &&
                        'border-border-brand bg-surface-selected text-text-primary',
                    )}
                  >
                    {fn(l, k.levels.find((x) => x.level === l.level)?.dailyLimit ?? '0')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid gap-3 tablet:grid-cols-3">
        {[
          [
            IdCard,
            level === 'level_1' ? 'Your legal details' : 'One valid ID document',
            level === 'level_1'
              ? 'Name, date of birth and address as on your ID'
              : 'Passport, national ID card or driving licence',
          ],
          [
            Camera,
            level === 'level_2' ? 'A camera' : 'A few minutes',
            level === 'level_2'
              ? 'For a 10-second selfie video on your phone or webcam'
              : 'Have the document ready before you start',
          ],
          [Clock, 'About 5 minutes', 'Review usually takes under 10 minutes, up to 24 h'],
        ].map(([Icon, t, b]) => {
          const I = Icon as typeof IdCard;
          return (
            <li key={t as string} className="flex flex-col gap-2 rounded-lg bg-surface-raised p-4">
              <I aria-hidden className="size-5 text-icon-brand" />
              <span className="text-label-l">{t as string}</span>
              <span className="text-caption text-text-secondary">{b as string}</span>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-3 rounded-lg border border-border-subtle p-4">
        <Shield aria-hidden className="mt-0.5 size-5 shrink-0 text-icon-brand" />
        <div>
          <p className="text-label-l">How we handle your data</p>
          <p className="mt-1 text-body-s text-text-secondary">
            Your documents and selfie video are encrypted in transit and at rest, and processed by
            our verification partner ([Partner name] — DEMO placeholder; mock provider in this
            build) only to confirm your identity and meet anti-money-laundering (AML) duties. We
            keep them for 5 years after your account closes, as the law requires, and never use them
            for marketing. Face data from the selfie is deleted within 30 days of a decision.
          </p>
          <p className="mt-2 flex flex-wrap gap-4 text-label-m">
            <Link href="/legal/aml" className="text-text-brand hover:underline">
              AML/KYC Policy
            </Link>
            <Link href="/legal/privacy" className="text-text-brand hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Review({
  app,
  ack,
  setAck,
  onEdit,
}: {
  app: KycApplicationView;
  ack: boolean;
  setAck: (v: boolean) => void;
  onEdit: (v: View) => void;
}) {
  const p = app.personal;
  const docs = app.documents.filter((d) => d.status !== 'rejected');
  return (
    <div className="flex flex-col gap-5">
      <StepTitle
        title={
          app.status === 'resubmission_required' ? 'Check and submit again' : 'Check and submit'
        }
        sub="Make sure everything is yours and up to date. You can’t change it while it’s being reviewed."
      />
      {p && (
        <SummaryBlock title="Personal details" onEdit={() => onEdit('details')}>
          {p.firstNames} {p.lastNames} · born {p.dateOfBirth} · {p.addressLine}, {p.postalCode}{' '}
          {p.city}, {p.country} · {p.pep === 'pep' ? 'PEP' : 'Not a PEP'}
        </SummaryBlock>
      )}
      {app.level !== 'level_1' && (
        <SummaryBlock title="Document" onEdit={() => onEdit('document')}>
          {app.documentType ? DOC_LABEL[app.documentType] : '—'} ·{' '}
          {docs.map((d) => d.side.replace('_', ' ')).join(' + ')} ·{' '}
          {app.requirements.document ? 'quality checks passed' : 'missing'}
        </SummaryBlock>
      )}
      {app.level === 'level_2' && (
        <SummaryBlock title="Selfie video" onEdit={() => onEdit('liveness')}>
          {app.liveness.status === 'passed'
            ? 'Recorded — liveness passed'
            : app.liveness.status === 'manual_review'
              ? 'Manual review by a specialist'
              : 'Not recorded yet'}
        </SummaryBlock>
      )}
      <NoteBox
        tone="info"
        title={`Level ${app.level === 'level_1' ? '0' : String(Number(app.level.slice(-1)) - 1)} limits apply until the decision`}
      >
        After approval you can withdraw up to {formatUSDT(app.dailyLimitAfter)} per day. Your own
        responsible-gaming limits always apply first.
      </NoteBox>
      <CheckboxField
        checked={ack}
        onCheckedChange={(v) => setAck(v === true)}
        label="I confirm these details and documents are accurate and belong to me"
        description="Giving false information can lead to your verification being refused and your account being closed."
      />
    </div>
  );
}

function SummaryBlock({
  title,
  children,
  onEdit,
}: {
  title: string;
  children: React.ReactNode;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border-subtle p-4">
      <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-text-success" />
      <div className="min-w-0 flex-1">
        <p className="text-label-l">{title}</p>
        <p className="text-body-s text-text-secondary">{children}</p>
      </div>
      <Button variant="ghost" size="s" onClick={onEdit}>
        Edit
      </Button>
    </div>
  );
}

function Pending({ app, k }: { app: KycApplicationView; k: KycView }) {
  const steps: [typeof CircleCheck, string, string, 'done' | 'now' | 'next'][] = [
    [
      CircleCheck,
      'Submitted',
      `${utc(app.submittedAt)} · details${app.documentType ? `, ${(DOC_LABEL[app.documentType] ?? '').toLowerCase()}` : ''}${app.level === 'level_2' ? ' and selfie video' : ''} received`,
      'done',
    ],
    [
      CircleCheck,
      'Automated checks — passed',
      'Document authenticity, face match, sanctions and PEP screening',
      'done',
    ],
    [Clock, 'Compliance review — in progress', 'A specialist confirms the result', 'now'],
    [Hourglass, 'Decision', 'By email and in-app notification', 'next'],
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-status-pending-tint text-status-pending">
          <Hourglass aria-hidden className="size-6" />
        </span>
        <div>
          <p className="flex flex-wrap items-center gap-2 text-overline uppercase text-status-pending">
            Pending review · submitted {utc(app.submittedAt)} <Demo size="xs" />
          </p>
          <h2 className="text-h3">We’re reviewing your documents</h2>
          <p className="mt-1 text-body-m text-text-secondary">
            Reference {app.reference}. You don’t need to do anything else right now.
          </p>
        </div>
      </div>
      <div className="grid gap-5 rounded-lg border border-border-subtle p-5 tablet:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
        <div>
          <p className="text-caption text-text-tertiary">Typical review time</p>
          <p className="text-h2">Under 10 min</p>
          <p className="text-caption text-text-secondary">
            Up to 24 h if a specialist needs to take a look
            {app.expectedBy ? ` — expected by ${utc(app.expectedBy)}` : ''}.
          </p>
        </div>
        <ol className="flex flex-col gap-3">
          {steps.map(([Icon, t, d, st]) => (
            <li key={t} className="flex gap-3">
              <Icon
                aria-label={st === 'done' ? 'Done' : st === 'now' ? 'In progress' : 'Next'}
                className={cn(
                  'mt-0.5 size-5 shrink-0',
                  st === 'done'
                    ? 'text-text-success'
                    : st === 'now'
                      ? 'text-status-pending'
                      : 'text-icon-muted',
                )}
              />
              <div>
                <p className="text-body-s-strong">{t}</p>
                <p className="text-caption text-text-tertiary">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="rounded-lg border border-border-subtle p-4">
        <p className="mb-2 flex items-center gap-2 text-label-l">
          What you submitted <Demo size="xs" className="ml-auto" />
        </p>
        <div className="flex flex-col gap-2">
          {app.personal && (
            <CheckLine ok>
              Personal details — {app.personal.firstNames} {app.personal.lastNames} · born{' '}
              {app.personal.dateOfBirth} · {app.personal.city}
            </CheckLine>
          )}
          {app.documentType && (
            <CheckLine ok>
              {DOC_LABEL[app.documentType]} —{' '}
              {app.documents
                .filter((d) => d.status === 'in_review')
                .map((d) => d.side.replace('_', ' '))
                .join(' and ')}
            </CheckLine>
          )}
          {app.level === 'level_2' && (
            <CheckLine ok>
              Selfie video —{' '}
              {app.liveness.status === 'passed'
                ? `recorded ${utc(app.liveness.lastAttemptAt)}`
                : 'manual review'}
            </CheckLine>
          )}
        </div>
      </div>
      <NoteBox tone="info" title="You can keep playing while we check">
        Level {levelNo(k.currentLevel)} limits apply until we finish: withdrawals up to{' '}
        {formatUSDT(k.dailyLimit)} a day. Nothing is paused.
      </NoteBox>
    </div>
  );
}

function Approved({ k, app }: { k: KycView; app: KycApplicationView | null }) {
  return (
    <div className="flex flex-col gap-5">
      <StepTitle
        title={`You’re verified — Level ${levelNo(k.currentLevel)}`}
        sub={
          app?.reviewedAt ? `Approved ${utc(app.reviewedAt)}.` : 'Your verification is complete.'
        }
      />
      <div className="grid gap-3 tablet:grid-cols-2">
        <div className="rounded-lg border border-border-brand bg-surface-selected p-4">
          <p className="text-caption text-text-tertiary">New withdrawal limit</p>
          <p className="text-number-m tabular-nums">{formatUSDT(k.dailyLimit)}</p>
          <p className="text-caption text-text-tertiary">per 24 h · all networks</p>
        </div>
        <div className="rounded-lg border border-border-subtle p-4">
          <p className="text-caption text-text-tertiary">Next level</p>
          <p className="text-body-m-strong">
            {k.currentLevel === 'level_3'
              ? 'You’re at the top level'
              : k.currentLevel === 'level_1'
                ? 'Level 2 · about 5 minutes'
                : 'Level 3 on request'}
          </p>
          <p className="text-caption text-text-tertiary">
            {k.currentLevel === 'level_1'
              ? 'ID document + selfie video · up to 25,000.00 USDT a day'
              : 'Only if you need higher limits'}
          </p>
        </div>
      </div>
      <NoteBox tone="success" title="Your own limits are unchanged">
        Verification never raises your responsible-gaming limits — deposit, loss and participation
        limits you set stay as they are.
      </NoteBox>
    </div>
  );
}

function ReasonsView({ app }: { app: KycApplicationView }) {
  const failed = app.checks.filter((c) => !c.ok);
  const passed = app.checks.filter((c) => c.ok);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-status-danger-tint text-text-danger">
          <TriangleAlert aria-hidden className="size-6" />
        </span>
        <div>
          <p className="flex flex-wrap items-center gap-2 text-overline uppercase text-text-danger">
            Reviewed {utc(app.reviewedAt)} · reference {app.reference} <Demo size="xs" />
          </p>
          <h2 className="text-h3">We couldn’t verify your ID yet</h2>
          <p className="mt-1 text-body-m text-text-secondary">
            We found {failed.length} {failed.length === 1 ? 'issue' : 'issues'} with what you sent.
            Fix {failed.length === 1 ? 'it' : 'them'} and resubmit — everything else is kept.
          </p>
        </div>
      </div>
      {failed.map((c) => (
        <div
          key={c.check}
          className="flex flex-col gap-2 rounded-lg border border-border-subtle p-4"
        >
          <p className="flex flex-wrap items-center gap-2 text-body-m-strong">
            {c.message}
            <ToneChip tone="danger" icon={TriangleAlert}>
              Needs fixing
            </ToneChip>
          </p>
          <div className="rounded-md bg-surface-raised p-3">
            <p className="text-label-s text-text-brand">How to fix</p>
            <p className="text-body-s text-text-primary">{c.fix}</p>
          </div>
        </div>
      ))}
      {passed.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body-s">
          <span className="text-text-tertiary">Passed:</span>
          {passed.map((c) => (
            <span key={c.check} className="inline-flex items-center gap-1">
              <CircleCheck aria-hidden className="size-4 text-text-success" />
              {c.message.split(' — ')[0]}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
