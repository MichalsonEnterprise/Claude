'use client';

/**
 * ADM-U3…U7, U9, U10 user tabs (read-only views + the logged PII reveal). No tab offers edits to personal data,
 * addresses, KYC results, risk scores, limits or balances.
 */
import {
  ADMIN_CONSOLE_REASON_CATEGORIES,
  ADMIN_PII_FIELD_LABEL,
  type AdminPiiField,
} from '@gp/shared/schemas';
import { KYC_LEVEL_LABEL, TX_TYPE_LABEL, TX_TYPES, type TxType } from '@gp/shared/enums';
import { formatDateTimeUTC, formatDateUTC, formatTimeUTC } from '@gp/shared/format';
import { formatUSDT, money } from '@gp/shared/money';
import { useMutation } from '@tanstack/react-query';
import {
  CircleCheck,
  CircleDashed,
  Eye,
  EyeOff,
  Fingerprint,
  History,
  Info,
  KeyRound,
  Lock,
  ShieldCheck,
  Smartphone,
  Timer,
  Wallet,
} from 'lucide-react';
import * as React from 'react';

import { AddressChip } from '@/components/domain/address-chip';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { revealUserPii } from '@/lib/api/admin-a';
import { cn } from '@/lib/utils';

import { AuditTable } from './audit';
import { ConfirmWithReasonDialog } from './four-eyes';
import {
  useUserAccount,
  useUserAml,
  useUserKyc,
  useUserRg,
  useUserTransactions,
  useUserWallets,
} from './hooks';
import {
  KeyValue,
  KycChip,
  Meter,
  Pagination,
  Panel,
  QueryErrorPanel,
  RISK_TONE,
  RiskChip,
} from './primitives';
import { useAdminSession } from './session';
import { useUserId } from './user-detail';

function Loading() {
  return (
    <div className="grid gap-4 laptop:grid-cols-2" aria-busy>
      <Skeleton className="h-56" />
      <Skeleton className="h-56" />
    </div>
  );
}

function ReadOnlyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md bg-surface-raised px-3 py-2.5 text-caption text-text-secondary">
      <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-muted" />
      <span>{children}</span>
    </p>
  );
}

// ── U3 Account details ──────────────────────────────────────────────────────────────────────────

const REVEAL_SECONDS = 60;

export function UserAccountTab() {
  const id = useUserId();
  const { admin } = useAdminSession();
  const acc = useUserAccount(id);
  const [field, setField] = React.useState<AdminPiiField | null>(null);
  const [revealed, setRevealed] = React.useState<
    Partial<Record<AdminPiiField, { value: string | null; seq: string; until: number }>>
  >({});
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    if (Object.keys(revealed).length === 0) return;
    const t = window.setInterval(() => {
      const now = Date.now();
      setRevealed((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v.until > now)));
      force();
    }, 1000);
    return () => window.clearInterval(t);
  }, [revealed]);

  if (acc.isPending) return <Loading />;
  if (acc.isError || !acc.data)
    return (
      <QueryErrorPanel
        error={acc.error}
        onRetry={() => void acc.refetch()}
        role={admin?.roles[0]}
        what="account details"
      />
    );
  const a = acc.data;
  const masked: Record<AdminPiiField, string | null> = {
    email: a.emailMasked,
    date_of_birth: a.dateOfBirthMasked,
    last_ip: a.sessions[0]?.ipMasked ?? null,
  };

  return (
    <div className="grid gap-4 laptop:grid-cols-2" data-testid="user-account">
      <Panel
        title="Personal data"
        icon={Eye}
        demo
        description="Masked by default. Revealing one field needs a reason and is audit-logged; nothing here can be edited."
      >
        <dl className="flex flex-col">
          {(Object.keys(masked) as AdminPiiField[]).map((f, i) => {
            const r = revealed[f];
            return (
              <KeyValue
                key={f}
                first={i === 0}
                label={ADMIN_PII_FIELD_LABEL[f]}
                value={
                  <span className="flex flex-wrap items-center justify-end gap-2">
                    <span
                      className={cn(
                        'font-mono text-mono-m',
                        r ? 'text-text-primary' : 'text-text-secondary',
                      )}
                      data-testid={`pii-${f}`}
                    >
                      {r ? (r.value ?? 'not on file') : (masked[f] ?? 'not on file')}
                    </span>
                    {r ? (
                      <span className="inline-flex items-center gap-1 text-caption text-text-tertiary">
                        <EyeOff aria-hidden className="size-3.5" /> logged #
                        {Number(r.seq).toLocaleString('en-US')} · hides in{' '}
                        {Math.max(0, Math.ceil((r.until - Date.now()) / 1000))} s
                      </span>
                    ) : a.canRevealPii && masked[f] ? (
                      <Button
                        variant="ghost"
                        size="s"
                        leadingIcon={<Eye aria-hidden />}
                        onClick={() => setField(f)}
                      >
                        Reveal
                      </Button>
                    ) : null}
                  </span>
                }
              />
            );
          })}
        </dl>
        {!a.canRevealPii && (
          <ReadOnlyNote>Revealing personal data needs the users.pii.read permission.</ReadOnlyNote>
        )}
      </Panel>

      <Panel title="Account" icon={KeyRound} demo>
        <dl className="flex flex-col">
          <KeyValue
            first
            label="Public id"
            value={<span className="font-mono">{a.publicId}</span>}
          />
          <KeyValue label="Display name" value={a.displayName ?? '—'} />
          <KeyValue label="Status" value={<span className="capitalize">{a.status}</span>} />
          <KeyValue label="Email verified" value={a.emailVerified ? 'Yes' : 'No'} />
          <KeyValue label="Country (declared)" value={a.country ?? '—'} />
          <KeyValue label="Created" value={formatDateTimeUTC(a.createdAt)} />
          <KeyValue
            label="Onboarded"
            value={a.onboardedAt ? formatDateTimeUTC(a.onboardedAt) : 'Not finished'}
          />
          <KeyValue
            label="Last sign-in"
            value={a.lastLoginAt ? formatDateTimeUTC(a.lastLoginAt) : 'Never'}
          />
        </dl>
      </Panel>

      <Panel
        title="Consents (read-only)"
        icon={CircleCheck}
        demo
        description="Captured at onboarding — never pre-checked. Admins cannot change consents."
      >
        <dl className="flex flex-col">
          <KeyValue
            first
            label="18+ confirmed"
            value={
              a.consents.ageConfirmedAt ? formatDateTimeUTC(a.consents.ageConfirmedAt) : 'Missing'
            }
          />
          <KeyValue
            label="Permitted jurisdiction"
            value={
              a.consents.jurisdictionConfirmedAt
                ? formatDateTimeUTC(a.consents.jurisdictionConfirmedAt)
                : 'Missing'
            }
          />
          <KeyValue
            label="Terms"
            value={
              a.consents.termsAcceptedAt
                ? `${a.consents.termsVersion ?? 'v?'} · ${formatDateUTC(a.consents.termsAcceptedAt)}`
                : 'Missing'
            }
          />
          <KeyValue
            label="Privacy"
            value={
              a.consents.privacyAcceptedAt
                ? `${a.consents.privacyVersion ?? 'v?'} · ${formatDateUTC(a.consents.privacyAcceptedAt)}`
                : 'Missing'
            }
          />
          <KeyValue
            label="Marketing opt-in"
            value={
              a.consents.marketingOptIn
                ? `Yes · ${a.consents.marketingOptInAt ? formatDateUTC(a.consents.marketingOptInAt) : ''}`
                : 'No'
            }
          />
        </dl>
      </Panel>

      <Panel title="Security" icon={Fingerprint} demo>
        <dl className="flex flex-col">
          <KeyValue
            first
            label="Two-factor"
            value={
              <StatusBadge
                status={a.security.twoFactor === 'active' ? 'confirmed' : 'expired'}
                label={
                  a.security.twoFactor === 'active'
                    ? `On since ${a.security.twoFactorSince ? formatDateUTC(a.security.twoFactorSince) : '—'}`
                    : 'Off'
                }
              />
            }
          />
          <KeyValue
            label="Backup codes left"
            value={a.security.twoFactor === 'active' ? String(a.security.backupCodesLeft) : '—'}
          />
          <KeyValue
            label="Anti-phishing code"
            value={a.security.antiPhishingCodeSet ? 'Set (hidden)' : 'Not set'}
          />
        </dl>
        <ReadOnlyNote>
          Only the player can change security settings (step-up 2FA). Support never asks for codes.
        </ReadOnlyNote>
      </Panel>

      <Panel title="Devices & sessions" icon={Smartphone} demo className="laptop:col-span-2">
        {a.sessions.length === 0 ? (
          <p className="text-body-s text-text-secondary">No sessions recorded.</p>
        ) : (
          <TableContainer className="border-0 bg-transparent">
            <Table density="compact" aria-label="Sessions">
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>IP (masked)</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {a.sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        {s.device} {s.isDemo && <DemoBadge size="xs" />}
                      </span>
                    </TableCell>
                    <TableCell>{s.location ?? '—'}</TableCell>
                    <TableCell className="font-mono text-mono-s">{s.ipMasked ?? '—'}</TableCell>
                    <TableCell>{formatDateTimeUTC(s.lastSeenAt)}</TableCell>
                    <TableCell>
                      {s.revokedAt ? (
                        <StatusBadge status="expired" label="Signed out" />
                      ) : s.flagged ? (
                        <StatusBadge status="under_review" label={s.flaggedReason ?? 'Flagged'} />
                      ) : (
                        <StatusBadge status="live" label="Active" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Panel>

      <PiiRevealDialog
        id={id}
        field={field}
        onClose={() => setField(null)}
        onRevealed={(f, value, seq) =>
          setRevealed((r) => ({
            ...r,
            [f]: { value, seq, until: Date.now() + REVEAL_SECONDS * 1000 },
          }))
        }
      />
    </div>
  );
}

function PiiRevealDialog({
  id,
  field,
  onClose,
  onRevealed,
}: {
  id: string;
  field: AdminPiiField | null;
  onClose: () => void;
  onRevealed: (f: AdminPiiField, value: string | null, seq: string) => void;
}) {
  const reveal = useMutation({
    mutationFn: (v: { field: AdminPiiField; reason: string }) =>
      revealUserPii(id, v.field, v.reason),
  });
  return (
    <ConfirmWithReasonDialog
      open={field !== null}
      onOpenChange={(o) => !o && onClose()}
      title={`Reveal ${field ? ADMIN_PII_FIELD_LABEL[field].toLowerCase() : 'field'}`}
      description="One field, once. The value is shown for 60 seconds and never stored in your browser. Your reason is logged."
      icon={Eye}
      categories={ADMIN_CONSOLE_REASON_CATEGORIES.pii_reveal}
      requireMfa={false}
      submitLabel="Reveal field"
      testId="pii-reveal-dialog"
      onSubmit={async (v) => {
        const r = await reveal.mutateAsync({
          field: field!,
          reason: `${v.reasonCategory} — ${v.reason}`,
        });
        onRevealed(field!, r.value, r.auditSeq);
        return {
          kind: 'done',
          title: 'Field revealed',
          body: 'Shown on the profile for 60 seconds.',
          auditSeq: r.auditSeq,
        };
      }}
    />
  );
}

// ── U4 Wallet addresses ─────────────────────────────────────────────────────────────────────────

const WALLET_STATUS: Record<
  string,
  { status: 'confirmed' | 'pending' | 'neutral' | 'expired'; label: string }
> = {
  whitelisted: { status: 'confirmed', label: 'Whitelisted' },
  cooldown: { status: 'pending', label: '24 h cool-down' },
  linked: { status: 'neutral', label: 'Linked wallet' },
  removed: { status: 'expired', label: 'Removed' },
};

export function UserWalletsTab() {
  const id = useUserId();
  const { admin } = useAdminSession();
  const w = useUserWallets(id);
  if (w.isPending) return <Loading />;
  if (w.isError || !w.data)
    return (
      <QueryErrorPanel
        error={w.error}
        onRetry={() => void w.refetch()}
        role={admin?.roles[0]}
        what="wallets"
      />
    );
  return (
    <div className="flex flex-col gap-4" data-testid="user-wallets">
      <Panel title="Withdrawal address book & linked wallets" icon={Wallet} demo>
        {w.data.wallets.length === 0 ? (
          <EmptyState
            title="No wallets"
            description="The player has not linked a wallet or whitelisted an address."
          />
        ) : (
          <TableContainer className="border-0 bg-transparent">
            <Table density="compact" aria-label="Wallets">
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead align="right">Withdrawals</TableHead>
                  <TableHead className="hidden laptop:table-cell">Last used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {w.data.wallets.map((x) => {
                  const st = WALLET_STATUS[x.status] ?? WALLET_STATUS.linked!;
                  return (
                    <TableRow key={x.id}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <AddressChip address={x.address} size="s" copyable demo={x.isDemo} />
                          {x.label && (
                            <span className="text-caption text-text-tertiary">{x.label}</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="capitalize">{x.network}</TableCell>
                      <TableCell className="text-text-secondary">
                        {x.source.replace(/_/g, ' ')}
                        {x.walletClient ? ` · ${x.walletClient}` : ''}
                      </TableCell>
                      <TableCell>
                        <span className="flex flex-col gap-0.5">
                          <StatusBadge status={st.status} label={st.label} />
                          {x.status === 'cooldown' && x.whitelistAvailableAt && (
                            <span className="text-caption text-text-tertiary">
                              usable {formatDateTimeUTC(x.whitelistAvailableAt)}
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell align="right">{x.withdrawalsCount}</TableCell>
                      <TableCell className="hidden laptop:table-cell">
                        {x.lastWithdrawalAt ? formatDateUTC(x.lastWithdrawalAt) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Panel>
      <div className="grid gap-4 laptop:grid-cols-2">
        <Panel
          title="Deposit addresses"
          icon={Wallet}
          demo
          description="Per-user HD addresses (xpub only — no keys on the server)."
        >
          {w.data.depositAddresses.length === 0 ? (
            <p className="text-body-s text-text-secondary">No deposit address assigned yet.</p>
          ) : (
            <dl className="flex flex-col">
              {w.data.depositAddresses.map((d, i) => (
                <KeyValue
                  key={d.id}
                  first={i === 0}
                  label={<span className="capitalize">{d.network}</span>}
                  value={
                    <span className="flex flex-col items-end gap-0.5">
                      <AddressChip address={d.address} size="s" copyable />
                      <span className="font-mono text-mono-s text-text-tertiary">
                        {d.derivationPath}
                      </span>
                    </span>
                  }
                />
              ))}
            </dl>
          )}
        </Panel>
        <Panel title="Address rules" icon={ShieldCheck}>
          <ul className="flex flex-col gap-2 text-body-s text-text-secondary">
            <li>New whitelisted addresses wait 24 hours before first use (player step-up 2FA).</li>
            <li>
              Every withdrawal destination is screened (sanctions, history, velocity, amount,
              account age).
            </li>
            <li>Flagged withdrawals need two different admins before they are released.</li>
          </ul>
          <ReadOnlyNote>
            Admins cannot add, edit, remove or redirect addresses — only the player can, with 2FA.
          </ReadOnlyNote>
        </Panel>
      </div>
    </div>
  );
}

// ── U5 KYC ──────────────────────────────────────────────────────────────────────────────────────

const LEVELS = ['level_1', 'level_2', 'level_3'] as const;
const RANK: Record<string, number> = { none: 0, level_1: 1, level_2: 2, level_3: 3 };

export function UserKycTab() {
  const id = useUserId();
  const { admin } = useAdminSession();
  const k = useUserKyc(id);
  if (k.isPending) return <Loading />;
  if (k.isError || !k.data)
    return (
      <QueryErrorPanel
        error={k.error}
        onRetry={() => void k.refetch()}
        role={admin?.roles[0]}
        what="KYC"
      />
    );
  const d = k.data;
  return (
    <div className="grid gap-4 laptop:grid-cols-[1.2fr_1fr]" data-testid="user-kyc">
      <Panel
        title="Verification"
        icon={ShieldCheck}
        demo
        actions={<KycChip level={d.level} status={d.status} />}
      >
        <ol className="grid gap-3 tablet:grid-cols-3" aria-label="KYC levels">
          {LEVELS.map((l) => {
            const done = RANK[d.level]! >= RANK[l]!;
            return (
              <li
                key={l}
                className={cn(
                  'flex flex-col gap-1.5 rounded-md border p-3',
                  done
                    ? 'border-border-brand bg-brand-tint-subtle'
                    : 'border-border-subtle bg-surface-raised',
                )}
              >
                <span className="flex items-center gap-1.5 text-label-m">
                  {done ? (
                    <CircleCheck aria-hidden className="size-4 text-text-success" />
                  ) : (
                    <CircleDashed aria-hidden className="size-4 text-icon-muted" />
                  )}
                  {l.replace('level_', 'Level ')}
                </span>
                <span className="text-caption text-text-tertiary">{KYC_LEVEL_LABEL[l]}</span>
              </li>
            );
          })}
        </ol>
        <dl className="mt-3 flex flex-col">
          <KeyValue first label="Current level" value={d.label} />
          <KeyValue
            label="Latest status"
            value={<span className="capitalize">{d.status.replace(/_/g, ' ')}</span>}
          />
          <KeyValue label="Daily withdrawal limit" value={formatUSDT(d.dailyWithdrawalLimit)} />
          <KeyValue
            label="Provider"
            value={d.provider === 'mock' ? 'Mock provider (DEMO)' : d.provider}
          />
        </dl>
      </Panel>
      <Panel title="Limits by level" icon={Info}>
        <dl className="flex flex-col">
          {d.limitsByLevel.map((l, i) => (
            <KeyValue
              key={l.level}
              first={i === 0}
              label={l.label}
              value={`${formatUSDT(l.dailyWithdrawalLimit)} / day`}
            />
          ))}
        </dl>
      </Panel>
      <Panel title="Review history" icon={History} demo className="laptop:col-span-2">
        {d.records.length === 0 ? (
          <p className="text-body-s text-text-secondary">No verification submitted yet.</p>
        ) : (
          <TableContainer className="border-0 bg-transparent">
            <Table density="compact" aria-label="KYC records">
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Reviewed</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.level.replace('level_', 'L')}</TableCell>
                    <TableCell className="capitalize">{r.status.replace(/_/g, ' ')}</TableCell>
                    <TableCell>{r.provider}</TableCell>
                    <TableCell>{r.submittedAt ? formatDateTimeUTC(r.submittedAt) : '—'}</TableCell>
                    <TableCell>{r.reviewedAt ? formatDateTimeUTC(r.reviewedAt) : '—'}</TableCell>
                    <TableCell className="whitespace-normal text-text-secondary">
                      {r.rejectionReason ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <ReadOnlyNote>
          KYC decisions are made in Compliance → KYC queue (reason required). Documents are never
          shown here.
        </ReadOnlyNote>
      </Panel>
    </div>
  );
}

// ── U6 AML risk ─────────────────────────────────────────────────────────────────────────────────

export function UserAmlTab() {
  const id = useUserId();
  const { admin } = useAdminSession();
  const q = useUserAml(id);
  if (q.isPending) return <Loading />;
  if (q.isError || !q.data)
    return (
      <QueryErrorPanel
        error={q.error}
        onRetry={() => void q.refetch()}
        role={admin?.roles[0]}
        what="AML risk"
      />
    );
  const { score, alerts } = q.data;
  const bands = Object.entries(score.bands) as [keyof typeof RISK_TONE, [number, number]][];
  return (
    <div className="grid gap-4 laptop:grid-cols-[1fr_1.3fr]" data-testid="user-aml">
      <Panel
        title="Risk score"
        icon={ShieldCheck}
        demo
        description={`Model ${q.data.model} — computed from real alerts, KYC level, account age and restrictions. No admin override exists.`}
      >
        <p className="flex items-baseline gap-2">
          <span className="text-number-l tabular-nums">{score.score}</span>
          <span className="text-body-s text-text-tertiary">/ 100</span>
          <RiskChip level={score.level} />
        </p>
        <div className="mt-2 grid grid-cols-4 gap-1" aria-hidden>
          {bands.map(([lvl, [lo, hi]]) => (
            <div key={lvl} className="flex flex-col gap-1">
              <span
                className={cn(
                  'h-2 rounded-full',
                  score.level === lvl ? 'opacity-100' : 'opacity-35',
                  RISK_TONE[lvl].split(' ')[0],
                )}
              />
              <span className="text-caption capitalize text-text-tertiary">
                {lvl} {lo}–{hi}
              </span>
            </div>
          ))}
        </div>
        <Meter
          value={score.score}
          max={100}
          label="Risk score"
          tone={score.level === 'low' ? 'brand' : score.level === 'medium' ? 'warning' : 'danger'}
        />
      </Panel>
      <Panel title="Score breakdown" icon={Info} demo>
        {score.factors.length === 0 ? (
          <p className="text-body-s text-text-secondary">No risk factors — score 0.</p>
        ) : (
          <dl className="flex flex-col">
            {score.factors.map((f, i) => (
              <KeyValue
                key={`${f.factor}-${i}`}
                first={i === 0}
                label={`${f.factor} · ${f.detail}`}
                value={`+${f.points}`}
              />
            ))}
            <KeyValue label="Total (capped at 100)" value={<strong>{score.score}</strong>} />
          </dl>
        )}
      </Panel>
      <Panel title="Screening alerts" icon={History} demo className="laptop:col-span-2">
        {alerts.length === 0 ? (
          <p className="text-body-s text-text-secondary">No AML alerts for this player.</p>
        ) : (
          <TableContainer className="border-0 bg-transparent">
            <Table density="compact" aria-label="AML alerts">
              <TableHeader>
                <TableRow>
                  <TableHead>Raised</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resolution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        {formatDateTimeUTC(a.createdAt)} {a.isDemo && <DemoBadge size="xs" />}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-mono-s">{a.rule}</TableCell>
                    <TableCell>
                      <RiskChip level={a.riskLevel} />
                    </TableCell>
                    <TableCell className="capitalize">{a.status.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="text-text-secondary">{a.resolution ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <ReadOnlyNote>
          Alerts are resolved in Compliance → AML alerts (reason + 2FA). Scores are model output and
          cannot be overridden.
        </ReadOnlyNote>
      </Panel>
    </div>
  );
}

// ── U7 Transactions ─────────────────────────────────────────────────────────────────────────────

export function UserTransactionsTab() {
  const id = useUserId();
  const { admin } = useAdminSession();
  const [page, setPage] = React.useState(1);
  const [type, setType] = React.useState<TxType | 'all'>('all');
  const q = useUserTransactions(id, { page, pageSize: 10, ...(type !== 'all' ? { type } : {}) });
  if (q.isPending) return <Loading />;
  if (q.isError || !q.data)
    return (
      <QueryErrorPanel
        error={q.error}
        onRetry={() => void q.refetch()}
        role={admin?.roles[0]}
        what="transactions"
      />
    );
  const d = q.data;
  return (
    <div className="flex flex-col gap-4" data-testid="user-transactions">
      <section aria-label="Lifetime flows" className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
        {d.lifetime.length === 0 ? (
          <p className="col-span-full text-body-s text-text-secondary">No completed flows yet.</p>
        ) : (
          d.lifetime.map((l) => (
            <div
              key={l.type}
              className="flex flex-col gap-1 rounded-lg border border-border-subtle bg-surface-default p-3"
            >
              <span className="flex items-center justify-between text-caption text-text-tertiary">
                {TX_TYPE_LABEL[l.type] ?? l.type} · {l.count}
                <DemoBadge size="xs" />
              </span>
              <span className="text-label-l tabular-nums">{formatUSDT(l.amount)}</span>
              {l.type === 'entry_purchase' && (
                <span className="text-caption text-text-tertiary">
                  + platform fees {formatUSDT(l.platformFees)}
                </span>
              )}
              {l.type === 'withdrawal' && (
                <span className="text-caption text-text-tertiary">
                  network fees {formatUSDT(l.networkFees)}
                </span>
              )}
            </div>
          ))
        )}
      </section>
      <Panel
        title="Transaction history"
        icon={History}
        demo
        actions={
          <Select
            value={type}
            onValueChange={(v) => {
              setType(v as TxType | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger size="s" aria-label="Transaction type" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TX_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TX_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        {d.items.length === 0 ? (
          <EmptyState
            type="no-results"
            title="No transactions"
            description="Nothing matches this type."
          />
        ) : (
          <TableContainer className="border-0 bg-transparent">
            <Table density="compact" aria-label="Transactions">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="hidden laptop:table-cell">Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead align="right">Amount</TableHead>
                  <TableHead align="right">Platform fee</TableHead>
                  <TableHead align="right">Network fee</TableHead>
                  <TableHead align="right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.items.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{formatDateTimeUTC(t.createdAt)}</TableCell>
                    <TableCell className="font-mono text-mono-s">
                      <span className="flex items-center gap-1.5">
                        {t.reference} {t.isDemo && <DemoBadge size="xs" />}
                      </span>
                    </TableCell>
                    <TableCell className="hidden laptop:table-cell">
                      {TX_TYPE_LABEL[t.type] ?? t.type}
                    </TableCell>
                    <TableCell className="capitalize">{t.status.replace(/_/g, ' ')}</TableCell>
                    <TableCell align="right">{formatUSDT(t.amount)}</TableCell>
                    <TableCell align="right">{formatUSDT(t.platformFee)}</TableCell>
                    <TableCell align="right">
                      {t.networkFee ? formatUSDT(t.networkFee) : '—'}
                    </TableCell>
                    <TableCell align="right">{formatUSDT(t.netAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Pagination
          page={d.page}
          totalPages={d.totalPages}
          total={d.total}
          label="transactions"
          onPage={setPage}
        />
        <ReadOnlyNote>
          Append-only. Corrections are new postings made by the workflows that own them — there is
          no edit or delete, and platform fees (0.05 USDT per entry) are always their own column,
          separate from network fees.
        </ReadOnlyNote>
      </Panel>
    </div>
  );
}

// ── U9 Responsible gaming ───────────────────────────────────────────────────────────────────────

const LIMIT_LABEL: Record<string, string> = {
  deposit: 'Deposit limit',
  participation: 'Participation limit',
  loss: 'Loss limit',
  session_time: 'Session time',
};

export function UserRgTab() {
  const id = useUserId();
  const { admin } = useAdminSession();
  const q = useUserRg(id);
  if (q.isPending) return <Loading />;
  if (q.isError || !q.data)
    return (
      <QueryErrorPanel
        error={q.error}
        onRetry={() => void q.refetch()}
        role={admin?.roles[0]}
        what="responsible gaming"
      />
    );
  const d = q.data;
  return (
    <div className="grid gap-4 laptop:grid-cols-[1.4fr_1fr]" data-testid="user-rg">
      <Panel
        title="Player-set limits"
        icon={Timer}
        demo
        description="Enforced server-side. Decreases apply immediately; increases wait 24 hours."
      >
        {d.limits.length === 0 ? (
          <p className="text-body-s text-text-secondary">The player has not set any limits.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {d.limits.map((l) => {
              const isMoney = l.limit !== null;
              // Display-only percentage (decimal math via @gp/shared/money; never float money).
              const pct =
                isMoney && l.limit && !money(l.limit).isZero()
                  ? Number(
                      money(l.used ?? '0')
                        .div(money(l.limit))
                        .times(100)
                        .toFixed(1),
                    )
                  : 0;
              return (
                <li key={`${l.type}-${l.period}`} className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-label-m">
                      {LIMIT_LABEL[l.type] ?? l.type} ·{' '}
                      <span className="capitalize text-text-tertiary">{l.period}</span>
                    </span>
                    <span className="text-label-m tabular-nums">
                      {isMoney
                        ? `${formatUSDT(l.used ?? '0')} / ${formatUSDT(l.limit!)}`
                        : `${l.minutes ?? '—'} min`}
                    </span>
                  </div>
                  {isMoney && (
                    <Meter
                      value={Math.min(100, pct)}
                      max={100}
                      label={`${LIMIT_LABEL[l.type] ?? l.type} usage, percent`}
                      tone={pct >= 100 ? 'danger' : pct > 80 ? 'warning' : 'brand'}
                    />
                  )}
                  {l.pendingIncrease && (
                    <span className="text-caption text-text-warning">
                      Increase to{' '}
                      {l.pendingIncrease.amount
                        ? formatUSDT(l.pendingIncrease.amount)
                        : `${l.pendingIncrease.minutes} min`}{' '}
                      pending · effective {formatDateTimeUTC(l.pendingIncrease.effectiveAt)} (24 h
                      cool-down)
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <Panel title="Protection status" icon={ShieldCheck} demo>
        <dl className="flex flex-col">
          <KeyValue
            first
            label="Self-exclusion"
            value={
              d.selfExclusion.active ? (
                <StatusBadge
                  status="restricted"
                  label={`Until ${d.selfExclusion.endsAt ? formatDateUTC(d.selfExclusion.endsAt) : 'indefinite'}`}
                />
              ) : (
                'Not active'
              )
            }
          />
          <KeyValue label="Reality check" value={`Every ${d.realityCheckMinutes} min`} />
          <KeyValue label="Withdrawals while excluded" value="Always available" />
        </dl>
        <p className="text-overline uppercase text-text-tertiary">Exclusion history</p>
        {d.exclusionHistory.length === 0 ? (
          <p className="text-body-s text-text-secondary">None.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {d.exclusionHistory.map((e) => (
              <li key={e.id} className="text-body-s text-text-secondary">
                {e.duration} · {formatDateUTC(e.startsAt)} →{' '}
                {e.endsAt ? formatDateUTC(e.endsAt) : 'indefinite'}
              </li>
            ))}
          </ul>
        )}
        <ReadOnlyNote>
          Admins can never loosen a player&apos;s limits or end a self-exclusion early.
        </ReadOnlyNote>
      </Panel>
    </div>
  );
}

// ── U10 Audit history ───────────────────────────────────────────────────────────────────────────

export function UserAuditTab() {
  const id = useUserId();
  return (
    <div className="flex flex-col gap-3" data-testid="user-audit">
      <p className="flex items-center gap-2 text-body-s text-text-secondary">
        <History aria-hidden className="size-4 text-icon-muted" />
        Every admin action on this player, newest first. Entries are hash-chained and immutable.
        Checked {formatTimeUTC(new Date())}.
      </p>
      <AuditTable fixed={{ targetId: id }} compactFilters />
    </div>
  );
}
