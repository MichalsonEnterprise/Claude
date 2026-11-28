'use client';

import {
  CircleCheck,
  Clock,
  FileText,
  IdCard,
  RotateCcw,
  ScanFace,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useKyc, useKycDocuments, type KycDocumentsView } from '@/lib/api/account';

import { DOC_LABEL } from './kyc-status';
import { ACCOUNT_ROUTES } from './nav';
import { DashboardPage } from './page-shell';
import {
  CardSkeleton,
  CheckLine,
  Demo,
  IconTile,
  QueryState,
  ToneChip,
  utc,
  type Tone,
} from './primitives';

const STATUS: Record<string, { tone: Tone; label: string; icon: typeof CircleCheck }> = {
  approved: { tone: 'success', label: 'Approved', icon: CircleCheck },
  accepted: { tone: 'info', label: 'Uploaded', icon: Clock },
  in_review: { tone: 'pending', label: 'In review', icon: Clock },
  rejected: { tone: 'danger', label: 'Needs retake', icon: XCircle },
  replaced: { tone: 'neutral', label: 'Replaced', icon: RotateCcw },
};

const SIDE: Record<string, string> = {
  photo_page: 'photo page',
  front: 'front',
  back: 'back',
  single: 'document',
};

/** USR-A5 Verification documents: documents on file (metadata only), requests, and adding a Level 3 document. */
export function DocumentsPage() {
  const q = useKycDocuments();
  const kyc = useKyc();
  const d: KycDocumentsView | undefined = q.data;
  const level = kyc.data?.currentLevel ?? 'none';
  const liveness = kyc.data?.application?.liveness;

  return (
    <DashboardPage
      tab="account"
      accountTab="documents"
      crumbs={[
        { label: 'Dashboard', href: ACCOUNT_ROUTES.dashboard },
        { label: 'Account & security', href: ACCOUNT_ROUTES.profile },
        { label: 'Verification documents' },
      ]}
      title="Verification documents"
      description="Documents you’ve shared for identity checks. Previews are never shown here — only our compliance team can open the full files at our verification partner."
    >
      <QueryState query={q} label="your documents" skeleton={<CardSkeleton rows={4} />}>
        {d && (
          <div className="grid items-start gap-6 laptop:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-6">
              <Card padding="l" className="gap-2">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-h5">On file</h2>
                    <p className="text-body-s text-text-secondary">
                      {d.counts.approved} approved
                      {d.counts.inReview ? ` · ${d.counts.inReview} in review` : ''}
                      {d.counts.rejected ? ` · ${d.counts.rejected} to retake` : ''} ·{' '}
                      {kyc.data?.currentLabel ?? ''}
                    </p>
                  </div>
                  <Demo show={d.items.some((i) => i.isDemo)} />
                </div>
                {d.items.length === 0 && d.verifiedRecords.length === 0 ? (
                  <EmptyState
                    icon={<FileText aria-hidden />}
                    title="No documents yet"
                    description="Documents appear here after you verify your identity."
                    actions={
                      <Button size="m" asChild>
                        <Link href={ACCOUNT_ROUTES.kycVerify}>Start verification</Link>
                      </Button>
                    }
                  />
                ) : (
                  <ul className="flex flex-col">
                    {d.items.map((doc) => {
                      const s = STATUS[doc.status] ?? STATUS.accepted!;
                      return (
                        <li
                          key={doc.id}
                          className="flex flex-col gap-3 border-t border-border-subtle py-4 first:border-t-0 tablet:flex-row tablet:items-center"
                        >
                          <div
                            aria-hidden
                            className="flex h-[60px] w-[88px] shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-raised"
                          >
                            <IdCard className="size-6 text-icon-muted" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-body-m-strong">
                              {DOC_LABEL[doc.documentType]} — {SIDE[doc.side]}
                            </p>
                            <p className="flex items-center gap-2 font-mono text-mono-s text-text-secondary">
                              <span className="truncate">{doc.fileName}</span> ·{' '}
                              {(doc.sizeBytes / 1024 / 1024).toFixed(1)} MB
                              <Demo show={doc.isDemo} size="xs" />
                            </p>
                            <p className="text-caption text-text-tertiary">
                              Uploaded {utc(doc.uploadedAt)}
                              {doc.reviewedAt && doc.status === 'approved'
                                ? ` · approved ${utc(doc.reviewedAt)}`
                                : ''}
                              {doc.status === 'replaced' && doc.issues.length
                                ? ' · not accepted: photo too blurry · replaced by a newer upload'
                                : ''}
                              {doc.extracted ? ` · valid until ${doc.extracted.expiresOn}` : ''} ·
                              Level {doc.level.slice(-1)}
                            </p>
                          </div>
                          <ToneChip tone={s.tone} icon={s.icon}>
                            {s.label}
                          </ToneChip>
                        </li>
                      );
                    })}
                    {liveness?.status === 'passed' && (
                      <li className="flex flex-col gap-3 border-t border-border-subtle py-4 tablet:flex-row tablet:items-center">
                        <div
                          aria-hidden
                          className="flex h-[60px] w-[88px] shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-raised"
                        >
                          <ScanFace className="size-6 text-icon-muted" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-body-m-strong">Selfie video — liveness check</p>
                          <p className="text-caption text-text-tertiary">
                            Recorded {utc(liveness.lastAttemptAt)} · used only to match you to your
                            ID · face data deleted within 30 days of a decision
                          </p>
                        </div>
                        <ToneChip tone="success" icon={CircleCheck}>
                          Passed
                        </ToneChip>
                      </li>
                    )}
                    {d.verifiedRecords.map((r) => (
                      <li
                        key={r.recordId}
                        className="flex flex-col gap-3 border-t border-border-subtle py-4 tablet:flex-row tablet:items-center"
                      >
                        <div
                          aria-hidden
                          className="flex h-[60px] w-[88px] shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-raised"
                        >
                          <ShieldCheck className="size-6 text-icon-muted" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-body-m-strong">
                            Level {r.level.slice(-1)} verification — held by our verification
                            partner
                          </p>
                          <p className="flex items-center gap-2 text-caption text-text-tertiary">
                            Submitted {utc(r.submittedAt)} · approved {utc(r.reviewedAt)} · provider{' '}
                            {r.provider}
                            <Demo show={r.isDemo} size="xs" />
                          </p>
                        </div>
                        <ToneChip tone="success" icon={CircleCheck}>
                          Approved
                        </ToneChip>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card padding="l" className="flex-row items-start gap-4">
                <IconTile icon={CircleCheck} tone="success" />
                <div>
                  <h2 className="text-body-m-strong">Nothing requested right now</h2>
                  <p className="mt-1 text-body-s text-text-secondary">
                    If we ever need more — for example source of funds for Level 3 — it appears here
                    and by email, with the reason and a deadline. We never ask for documents by
                    chat, phone or social media.
                  </p>
                </div>
              </Card>
            </div>

            <aside className="flex flex-col gap-4">
              <Card padding="l" className="gap-3">
                <h2 className="text-h5">Upload a document</h2>
                <p className="text-body-s text-text-secondary">
                  {level === 'level_2'
                    ? 'Applying for Level 3? Add a proof of address — we review it within 3 business days.'
                    : level === 'level_3'
                      ? 'You’re at the top level. Moving house? Add a new proof of address.'
                      : 'Verify your identity first — your documents are added during verification.'}
                </p>
                <p className="text-label-l">Proof of address must…</p>
                {[
                  'be issued in the last 3 months',
                  'show your name and residential address',
                  'be a utility bill, bank statement or tax letter',
                  'be the original file — no screenshots or edits',
                ].map((t) => (
                  <CheckLine key={t} ok tone="info">
                    {t}
                  </CheckLine>
                ))}
                <Button size="m" leadingIcon={<Upload aria-hidden />} asChild>
                  <Link href={ACCOUNT_ROUTES.kycVerify}>
                    {level === 'level_2'
                      ? 'Start Level 3'
                      : level === 'none'
                        ? 'Start verification'
                        : level === 'level_1'
                          ? 'Continue to Level 2'
                          : 'Open verification'}
                  </Link>
                </Button>
              </Card>
            </aside>
          </div>
        )}
      </QueryState>
    </DashboardPage>
  );
}
