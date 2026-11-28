'use client';

import { formatDateUTC } from '@gp/shared/format';
import { formatUSDT } from '@gp/shared/money';
import {
  ArrowUpRight,
  CircleCheck,
  CircleHelp,
  Clock,
  FileText,
  Hourglass,
  IdCard,
  Lock,
  MapPin,
  MessageCircle,
  ScanFace,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { ROUTES } from '@/components/shell/nav-config';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useKyc, useMe, type KycApplicationView, type KycView } from '@/lib/api/account';
import { cn } from '@/lib/utils';

import { kycState, type KycState } from './logic';
import { ACCOUNT_ROUTES } from './nav';
import { DashboardPage } from './page-shell';
import {
  CardSkeleton,
  CheckLine,
  Demo,
  IconTile,
  NoteBox,
  QueryState,
  ToneChip,
  toneBorder,
  utc,
  type Tone,
} from './primitives';

export const DOC_LABEL: Record<string, string> = {
  passport: 'Passport',
  id_card: 'National ID card',
  driving_licence: 'Driving licence',
  proof_of_address: 'Proof of address',
};

export const LEVEL_INFO = [
  {
    level: 'level_1' as const,
    short: 'L1',
    name: 'Basic',
    checks: ['Name, date of birth and address', 'Email confirmation'],
    unlocks: ['Deposits and play', 'Withdrawals up to the daily limit', 'Responsible-gaming tools'],
  },
  {
    level: 'level_2' as const,
    short: 'L2',
    name: 'Full verification',
    checks: ['Government photo ID', 'Short selfie liveness check'],
    unlocks: [
      'Everything in Level 1',
      'Global Pool prizes of any size',
      'Faster withdrawal reviews',
    ],
  },
  {
    level: 'level_3' as const,
    short: 'L3',
    name: 'Enhanced',
    checks: ['Proof of address (last 3 months)', 'Source of funds — only if asked'],
    unlocks: ['Everything in Level 2', 'Higher limits on request', 'Dedicated account review'],
  },
];

export { kycState, type KycState } from './logic';

const HERO: Record<KycState, { tone: Tone; icon: typeof ShieldCheck; chip: string }> = {
  not_started: { tone: 'info', icon: IdCard, chip: 'Not started' },
  draft: { tone: 'info', icon: IdCard, chip: 'In progress' },
  review: { tone: 'pending', icon: Hourglass, chip: 'Pending review' },
  verified: { tone: 'success', icon: ShieldCheck, chip: 'Approved' },
  fix: { tone: 'danger', icon: XCircle, chip: 'Resubmit' },
};

function levelNo(l: string) {
  return l === 'none' ? '0' : l.slice(-1);
}

/** USR-A4 KYC status: Not started · In progress · Pending · Approved · Resubmit, plus the levels ladder. */
export function KycStatusPage() {
  const kyc = useKyc();
  const me = useMe();
  const k = kyc.data;
  const state = kycState(k);
  const app = k?.application ?? null;
  const hero = HERO[state];
  const showLevel = state === 'verified' ? (k?.currentLevel ?? 'none') : (app?.level ?? 'level_1');
  const demo = (app?.isDemo ?? false) || (me.data?.isDemo ?? false);

  return (
    <DashboardPage
      tab="account"
      accountTab="kyc"
      crumbs={[
        { label: 'Dashboard', href: ACCOUNT_ROUTES.dashboard },
        { label: 'Account & security', href: ACCOUNT_ROUTES.profile },
        { label: 'Identity verification' },
      ]}
      title="Identity verification (KYC)"
      description="Licensed operators must verify every player. Your level sets withdrawal limits only — it never changes odds, outcomes or your chance of winning."
    >
      <QueryState query={kyc} label="your verification status" skeleton={<CardSkeleton rows={5} />}>
        {k && (
          <>
            <Card padding="l" className={cn('gap-6 laptop:flex-row', toneBorder(hero.tone))}>
              <div className="flex flex-1 flex-col gap-4">
                <div className="flex items-start gap-4">
                  <IconTile icon={hero.icon} tone={hero.tone} size={48} />
                  <div>
                    <p className="flex flex-wrap items-center gap-2">
                      <ToneChip tone={hero.tone} icon={hero.icon}>
                        KYC L{levelNo(showLevel)} · {hero.chip}
                      </ToneChip>
                      <Demo show={demo} />
                    </p>
                    {app && (
                      <p className="mt-1 text-caption text-text-tertiary">
                        {state === 'verified' && app.reviewedAt
                          ? `Verified ${utc(app.reviewedAt)} · `
                          : ''}
                        {state === 'review' && app.submittedAt
                          ? `Submitted ${utc(app.submittedAt)} · `
                          : ''}
                        Ref {app.reference}
                      </p>
                    )}
                  </div>
                </div>
                <HeroCopy state={state} k={k} app={app} />
              </div>
              {state === 'verified' && (
                <VerifiedDetails k={k} app={app} country={me.data?.country ?? null} demo={demo} />
              )}
              {state === 'review' && app && <ReviewTimeline app={app} />}
            </Card>

            {state === 'fix' && app && <FixCard app={app} />}

            <section aria-labelledby="levels-h" className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <h2 id="levels-h" className="text-h4">
                  Verification levels and limits
                </h2>
                <Demo size="m" className="ml-auto" />
              </div>
              <ul className="grid gap-4 laptop:grid-cols-3">
                {LEVEL_INFO.map((l) => {
                  const lv = k.levels.find((x) => x.level === l.level);
                  const current = k.currentLevel === l.level;
                  const reached = lv?.reached ?? false;
                  const inProgress = app && app.level === l.level && state !== 'verified';
                  return (
                    <li key={l.level}>
                      <Card
                        className={cn(
                          'h-full gap-4',
                          current && 'border-border-brand bg-surface-selected',
                        )}
                        padding="l"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <ToneChip
                            tone={reached ? 'success' : inProgress ? 'pending' : 'neutral'}
                            icon={reached ? CircleCheck : inProgress ? Clock : Lock}
                          >
                            KYC {l.short} ·{' '}
                            {reached ? 'Approved' : inProgress ? 'In progress' : 'Not started'}
                          </ToneChip>
                          {current ? (
                            <span className="text-overline uppercase text-text-brand">
                              Your level
                            </span>
                          ) : l.level === 'level_3' ? (
                            <span className="text-overline uppercase text-text-tertiary">
                              Optional
                            </span>
                          ) : null}
                        </div>
                        <h3 className="text-h5">{l.name}</h3>
                        <div className="border-b border-border-subtle pb-4">
                          <p className="text-overline uppercase text-text-tertiary">
                            Withdrawals per 24 h
                          </p>
                          <p className="flex items-baseline gap-2">
                            <span className="text-number-m tabular-nums">
                              {formatUSDT(lv?.dailyLimit ?? '0', { symbol: false })}
                            </span>
                            <span className="text-body-s text-text-tertiary">USDT</span>
                            <Demo size="xs" />
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="text-label-m text-text-secondary">We check</p>
                          {l.checks.map((c) => (
                            <p key={c} className="flex items-center gap-2 text-body-s">
                              <IdCard aria-hidden className="size-4 text-icon-muted" /> {c}
                            </p>
                          ))}
                          <p className="mt-2 text-label-m text-text-secondary">Unlocks</p>
                          {l.unlocks.map((c) => (
                            <CheckLine key={c} ok>
                              {c}
                            </CheckLine>
                          ))}
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
              <p className="flex items-center gap-2 text-caption text-text-tertiary">
                <CircleHelp aria-hidden className="size-4 text-text-info" /> Limits are rolling 24
                h. Responsible-gaming limits you set always apply first.
              </p>
            </section>

            <div className="grid gap-4 laptop:grid-cols-2">
              <Card className="flex-row items-start gap-4" padding="l">
                <IconTile icon={Lock} tone="neutral" />
                <div>
                  <h2 className="text-h5">How we handle your documents</h2>
                  <p className="mt-1 text-body-s text-text-secondary">
                    Checks run through our licensed verification partner (name is a DEMO
                    placeholder; the mock provider is used in this build). Files are encrypted,
                    never shown to other players, and kept 5 years after account closure as AML law
                    requires.
                  </p>
                </div>
              </Card>
              <Card className="flex-col items-start gap-4 tablet:flex-row" padding="l">
                <IconTile icon={CircleHelp} tone="info" />
                <div className="flex-1">
                  <h2 className="text-h5">Questions about verification?</h2>
                  <p className="mt-1 text-body-s text-text-secondary">
                    We never ask you to send documents by chat or email — only upload them here. We
                    never charge a fee to verify you.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="m"
                  leadingIcon={<MessageCircle aria-hidden />}
                  asChild
                >
                  <Link href={ROUTES.support}>Contact support</Link>
                </Button>
              </Card>
            </div>
          </>
        )}
      </QueryState>
    </DashboardPage>
  );
}

function HeroCopy({
  state,
  k,
  app,
}: {
  state: KycState;
  k: KycView;
  app: KycApplicationView | null;
}) {
  const l1 = k.levels.find((l) => l.level === 'level_1')?.dailyLimit ?? '2000.00';
  const content: Record<KycState, { title: string; body: string; actions: React.ReactNode }> = {
    not_started: {
      title: 'Verify your identity to withdraw',
      body: `You haven’t started verification yet. Level 1 takes about 2 minutes and unlocks deposits, play and withdrawals up to ${formatUSDT(l1)} per day. We tell you now so nothing is a surprise later.`,
      actions: (
        <>
          <Button size="m" asChild>
            <Link href={ACCOUNT_ROUTES.kycVerify}>Start verification</Link>
          </Button>
          <Button variant="ghost" size="m" asChild>
            <a href="#levels-h">What we check</a>
          </Button>
        </>
      ),
    },
    draft: {
      title: `Continue your ${app?.levelLabel.split(' — ')[0] ?? ''} verification`,
      body: 'Your progress is saved — pick up where you left off. Nothing has been sent for review yet.',
      actions: (
        <Button size="m" asChild>
          <Link href={ACCOUNT_ROUTES.kycVerify}>Continue verification</Link>
        </Button>
      ),
    },
    review: {
      title: `We’re reviewing your Level ${app ? levelNo(app.level) : ''} documents`,
      body: `Most reviews finish within 10 minutes, at most 24 hours${app?.expectedBy ? ` — expected by ${utc(app.expectedBy)}` : ''}. We’ll notify you in the app. Level ${levelNo(k.currentLevel)} limits stay active meanwhile.`,
      actions: (
        <>
          <Button variant="secondary" size="m" asChild>
            <Link href={ACCOUNT_ROUTES.kycVerify}>View submission</Link>
          </Button>
          <Button variant="ghost" size="m" asChild>
            <Link href={ROUTES.support}>Contact support</Link>
          </Button>
        </>
      ),
    },
    verified: {
      title: `You’re verified — Level ${levelNo(k.currentLevel)}`,
      body: `Withdraw up to ${formatUSDT(k.dailyLimit)} every 24 hours and receive Global Pool prizes of any size. Nothing to do now.`,
      actions: (
        <>
          {k.currentLevel !== 'level_3' && (
            <Button variant="secondary" size="m" leadingIcon={<ArrowUpRight aria-hidden />} asChild>
              <Link href={ACCOUNT_ROUTES.kycVerify}>
                Upgrade to Level {Number(levelNo(k.currentLevel)) + 1}
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="m" leadingIcon={<FileText aria-hidden />} asChild>
            <Link href={ACCOUNT_ROUTES.documents}>View documents</Link>
          </Button>
        </>
      ),
    },
    fix: {
      title: `We couldn’t approve your Level ${app ? levelNo(app.level) : ''} documents`,
      body: `Reviewed ${utc(app?.reviewedAt)}. Nothing is wrong with your account — ${app?.failedChecks.length === 1 ? 'one item needs' : 'some items need'} redoing. Level ${levelNo(k.currentLevel)} limits stay active and you can resubmit right away.`,
      actions: (
        <Button size="m" asChild>
          <Link href={ACCOUNT_ROUTES.kycVerify}>Fix and resubmit</Link>
        </Button>
      ),
    },
  };
  const c = content[state];
  return (
    <>
      <h2 className="text-h3">{c.title}</h2>
      <p className="max-w-[600px] text-body-m text-text-secondary">{c.body}</p>
      <div className="flex flex-wrap gap-3">{c.actions}</div>
    </>
  );
}

function VerifiedDetails({
  k,
  app,
  country,
  demo,
}: {
  k: KycView;
  app: KycApplicationView | null;
  country: { name: string | null; permitted: boolean } | null;
  demo: boolean;
}) {
  const doc = app?.documents.find((d) => d.side === 'photo_page' || d.side === 'front');
  const rows: [string, React.ReactNode][] = [
    [
      'Level',
      <span key="l" className="inline-flex items-center gap-1">
        <CircleCheck aria-hidden className="size-4 text-text-success" /> {k.currentLabel}
      </span>,
    ],
    [
      'Identity document',
      doc
        ? `${DOC_LABEL[doc.documentType]}${doc.issuingCountry ? ` · ${doc.issuingCountry}` : ''}`
        : 'Checked by our partner',
    ],
    ['Document expires', doc?.extracted ? formatDateUTC(doc.extracted.expiresOn) : '—'],
    [
      'Liveness check',
      app?.liveness.status === 'passed' ? (
        <span key="v" className="inline-flex items-center gap-1">
          <ScanFace aria-hidden className="size-4 text-text-success" /> Passed
          {app.liveness.lastAttemptAt ? ` · ${formatDateUTC(app.liveness.lastAttemptAt)}` : ''}
        </span>
      ) : (
        '—'
      ),
    ],
    [
      'Country',
      <span key="c" className="inline-flex items-center gap-1">
        <MapPin aria-hidden className="size-4 text-icon-muted" />{' '}
        {country ? `${country.name} (${country.permitted ? 'permitted' : 'restricted'})` : '—'}
      </span>,
    ],
    [
      'Withdrawal limit',
      <span key="w" className="inline-flex items-center gap-2">
        {formatUSDT(k.dailyLimit)} / 24 h <Demo show={demo} size="xs" />
      </span>,
    ],
  ];
  return (
    <div className="w-full rounded-lg bg-bg-secondary p-5 laptop:w-[360px]">
      <p className="mb-2 text-overline uppercase text-text-tertiary">Verification details</p>
      <dl className="flex flex-col text-body-s">
        {rows.map(([label, v]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-3 border-t border-border-subtle py-2.5 first:border-t-0"
          >
            <dt className="text-text-tertiary">{label}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ReviewTimeline({ app }: { app: KycApplicationView }) {
  const steps: { t: string; when: string; done: boolean | 'now' }[] = [
    { t: 'Documents submitted', when: utc(app.submittedAt), done: true },
    { t: 'Automated checks — document, face match, liveness', when: 'Passed', done: true },
    { t: 'Compliance review', when: 'In progress', done: 'now' },
    {
      t: 'Decision',
      when: app.expectedBy
        ? `Expected by ${utc(app.expectedBy)}`
        : 'Usually under 10 min · up to 24 h',
      done: false,
    },
  ];
  return (
    <div className="w-full rounded-lg bg-bg-secondary p-5 laptop:w-[400px]">
      <p className="mb-2 flex items-center gap-2 text-overline uppercase text-text-tertiary">
        Review progress <Demo size="xs" />
      </p>
      <ol className="flex flex-col">
        {steps.map((s) => (
          <li
            key={s.t}
            className="flex items-center gap-3 border-t border-border-subtle py-2.5 first:border-t-0"
          >
            {s.done === true ? (
              <CircleCheck aria-label="Done" className="size-5 shrink-0 text-text-success" />
            ) : s.done === 'now' ? (
              <Clock aria-label="In progress" className="size-5 shrink-0 text-status-pending" />
            ) : (
              <Hourglass aria-label="Next" className="size-5 shrink-0 text-text-info" />
            )}
            <span className="flex-1 text-body-s-strong">{s.t}</span>
            <span className="text-caption text-text-tertiary">{s.when}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function FixCard({ app }: { app: KycApplicationView }) {
  const failed = app.checks.filter((c) => !c.ok);
  const passed = app.checks.filter((c) => c.ok);
  return (
    <div className="grid gap-4 laptop:grid-cols-2">
      <Card padding="l" className="gap-3">
        <h2 className="text-h5">What we found</h2>
        <p className="text-body-s text-text-secondary">
          Only these checks failed. Everything else is saved, so you won’t repeat it.
        </p>
        {failed.map((c) => (
          <NoteBox key={c.check} tone="danger" title={c.message}>
            {c.fix}
          </NoteBox>
        ))}
      </Card>
      <Card padding="l" className="gap-3">
        <h2 className="text-h5">What passed</h2>
        {passed.map((c) => (
          <CheckLine key={c.check} ok>
            {c.message}
          </CheckLine>
        ))}
      </Card>
    </div>
  );
}
