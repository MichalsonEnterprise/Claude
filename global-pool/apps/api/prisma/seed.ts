/**
 * GLOBAL POOL — DEMO seed (runs only with DEMO_MODE=true).
 *
 * Loads the typed DEMO data from @gp/shared (design/figma-build/demo-data.md) into a FRESH database:
 * - admin RBAC (roles, permissions, policies) + DEMO admins with argon2id passwords and active TOTP
 * - @nova.k with balances posted as real, balanced ledger postings:
 *     Available 9,215.30 · Locked 1,850.00 (350.00 entries #1,248 + 1,500.00 WD-20931) · Pending 1,000.00 (DP-77412)
 *     · Owed 415.20 (300.00 refund #1,245 + 115.20 VIP reward) = Total 12,480.50
 * - round #1,248 OPEN with 3,412 participants / 18,640 entries / pool 186,400.00 / fees 932.00 (DEMO crowd users),
 *   history #1,244–#1,247 (snapshots + listed winners), games, VIP levels, geo rules, feature flags, affiliates.
 *
 * Every seeded record is flagged is_demo. Timestamps are the demo-data dates shifted by whole days so the current
 * round closes at the NEXT 20:00 UTC (countdowns stay real). Set DEMO_SEED_SHIFT_DAYS=0 for the exact snapshot.
 * Dev credentials (admin passwords + TOTP secrets, @nova.k TOTP) are written to apps/api/.dev/ (git-ignored).
 */
import {
  type Prisma,
  PrismaClient,
  type LedgerPostingKind,
  type WithdrawalStatus,
} from '@prisma/client';
import {
  ADMIN_ROLES,
  ADMIN_ROLE_LABEL,
  DEMO,
  DEMO_HANDLES,
  DEMO_USER,
  PERMISSIONS,
  PERMISSION_POLICY,
  ROLE_PERMISSIONS,
  demoId,
  entryQuote,
  formatRoundNumber,
  money,
  toUSDTString,
} from '@gp/shared';
import { generateSecret, generateURI } from 'otplib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import { decryptSecret, encryptSecret } from '../src/common/crypto';
import { hashAdminPassword } from '../src/modules/admin/admin-auth.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { DEFAULT_FLAGS } from '../src/modules/feature-flags/feature-flags.service';
import { LedgerService } from '../src/modules/ledger/ledger.service';
import {
  depositCreditedLines,
  depositDetectedLines,
  entryPurchaseLines,
  normalizePosting,
  roundRefundLines,
  withdrawalLockLines,
  withdrawalReleaseLines,
  withdrawalSettleLines,
  type AccountRef,
  type PostingLineInput,
} from '../src/modules/ledger/posting';
import { DEFAULT_PRIZE_SPLIT_BPS } from '../src/modules/randomness/selection';
import type { PrismaService } from '../src/infra/prisma/prisma.service';
import { findApiRoot, loadEnvFiles } from '../src/config/load-env';

loadEnvFiles();

const prisma = new PrismaClient();
const ledger = new LedgerService(prisma as unknown as PrismaService);
type Tx = Prisma.TransactionClient;

// ── time shift ─────────────────────────────────────────────────────────────────────────────────

const DAY = 86_400_000;
const BASE_CLOSE = Date.parse(DEMO.currentRound.closesAt); // 2026-11-27T20:00:00Z
const SHIFT_DAYS =
  process.env.DEMO_SEED_SHIFT_DAYS !== undefined && process.env.DEMO_SEED_SHIFT_DAYS !== ''
    ? Number(process.env.DEMO_SEED_SHIFT_DAYS)
    : Math.max(0, Math.ceil((Date.now() + 60_000 - BASE_CLOSE) / DAY));
const T = (iso: string) => new Date(Date.parse(iso) + SHIFT_DAYS * DAY);

const NOVA = DEMO_USER.id;
const NOVA_DID = 'did:privy:demo-nova-k';
const ENTRY = '10.00';

// ── bulk posting helper (validated with the same rules as LedgerService.post) ─────────────────

interface SeedPosting {
  kind: LedgerPostingKind;
  description: string;
  reference?: string;
  eventKey?: string;
  transactionId?: string;
  roundId?: string;
  createdAt: Date;
  lines: PostingLineInput[];
}

async function bulkPost(tx: Tx, postings: SeedPosting[]): Promise<string[]> {
  const normalized = postings.map((p) => ({
    ...p,
    id: randomUUID(),
    lines: normalizePosting(p.lines),
  }));
  const refs: AccountRef[] = normalized.flatMap((p) => p.lines.map((l) => l.account));
  const accounts = await ledger.ensureAccounts(tx, refs);
  for (let i = 0; i < normalized.length; i += 1000) {
    await tx.ledgerPosting.createMany({
      data: normalized.slice(i, i + 1000).map((p) => ({
        id: p.id,
        kind: p.kind,
        description: p.description,
        reference: p.reference ?? null,
        eventKey: p.eventKey ?? null,
        transactionId: p.transactionId ?? null,
        roundId: p.roundId ?? null,
        isDemo: true,
        createdAt: p.createdAt,
        updatedAt: p.createdAt,
      })),
    });
  }
  const lines = normalized.flatMap((p) =>
    p.lines.map((l) => ({
      postingId: p.id,
      accountId: accounts.get(l.code)!,
      amount: l.amount,
      userId: l.userId,
      createdAt: p.createdAt,
      updatedAt: p.createdAt,
    })),
  );
  for (let i = 0; i < lines.length; i += 5000) {
    await tx.ledgerEntry.createMany({ data: lines.slice(i, i + 5000) });
  }
  return normalized.map((p) => p.id);
}

// ── sections ───────────────────────────────────────────────────────────────────────────────────

async function seedRbacAndAdmins(tx: Tx) {
  await tx.adminPermission.createMany({
    data: PERMISSIONS.map((key) => ({
      key,
      requiresReason: PERMISSION_POLICY[key].requiresReason,
      requiresMfa: PERMISSION_POLICY[key].requiresMfa,
      fourEyes: PERMISSION_POLICY[key].fourEyes,
    })),
  });
  await tx.adminRole.createMany({
    data: ADMIN_ROLES.map((key) => ({ key, name: ADMIN_ROLE_LABEL[key] })),
  });
  const roles = await tx.adminRole.findMany();
  const perms = await tx.adminPermission.findMany();
  await tx.adminRolePermission.createMany({
    data: roles.flatMap((r) =>
      ROLE_PERMISSIONS[r.key as keyof typeof ROLE_PERMISSIONS].map((p) => ({
        roleId: r.id,
        permissionId: perms.find((x) => x.key === p)!.id,
      })),
    ),
  });

  const password = process.env.ADMIN_SEED_PASSWORD || 'GlobalPool-Demo-2026!';
  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_SEED_PASSWORD) {
    throw new Error('Set ADMIN_SEED_PASSWORD to seed DEMO admins in production');
  }
  const passwordHash = await hashAdminPassword(password);
  const key = Buffer.from(process.env.TOTP_ENCRYPTION_KEY ?? '', 'base64');
  if (key.length !== 32) throw new Error('TOTP_ENCRYPTION_KEY must be 32 bytes (base64)');
  const credentials: Record<string, unknown>[] = [];
  for (const a of DEMO.admins) {
    const secret = generateSecret();
    await tx.adminUser.create({
      data: {
        id: a.id,
        email: a.email,
        name: a.name,
        title: a.title,
        passwordHash,
        isDemo: true,
        roles: { create: { roleId: roles.find((r) => r.key === a.role)!.id } },
        totpSecret: {
          create: {
            secretEnc: encryptSecret(secret, key),
            status: 'active',
            confirmedAt: new Date(),
          },
        },
      },
    });
    credentials.push({
      name: a.name,
      title: a.title,
      role: a.role,
      email: a.email,
      password,
      totpSecret: secret,
      otpauthUrl: generateURI({
        issuer: process.env.TOTP_ISSUER ?? 'GLOBAL POOL (DEMO)',
        label: a.email,
        secret,
      }),
    });
  }
  return credentials;
}

async function seedCatalogue(tx: Tx) {
  await tx.game.createMany({
    data: DEMO.games.map((g, i) => ({
      id: g.id,
      slug: g.slug,
      name: g.name,
      category: g.category,
      mechanic: g.mechanic,
      houseEdgePercent: g.houseEdgePercent,
      edgeLabel: g.edgeLabel,
      icon: g.icon,
      playersDemo: g.players,
      details: g.details,
      mode: g.mode,
      sortOrder: i,
      isDemo: true,
    })),
  });
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const nextMin = (i: number) => DEMO.vipTiers[i + 1]?.minPoints ?? 100_000;
  const rewards: Record<number, string> = {
    12: '2.00',
    13: '3.00',
    14: '5.00',
    15: '8.00',
    16: '10.00',
    17: '15.00',
    18: '25.00',
  };
  await tx.vipLevel.createMany({
    data: DEMO.vipTiers.flatMap((t, ti) => {
      const [from, to] = t.levels;
      const n = to - from + 1;
      const step = (nextMin(ti) - t.minPoints) / n;
      return Array.from({ length: n }, (_, i) => ({
        level: from + i,
        tier: t.tier,
        label: `${t.name} ${roman[i]}`,
        minPoints: Math.round(t.minPoints + step * i),
        levelUpReward: rewards[from + i] ?? null,
      }));
    }),
  });
  const restricted = (process.env.RESTRICTED_COUNTRIES ?? 'US,CU,IR,KP,SY')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  await tx.geoRule.createMany({
    data: [
      ...restricted.map((c) => ({
        countryCode: c,
        status: 'blocked' as const,
        reason: 'PLACEHOLDER list — the restricted-jurisdiction list is a legal decision',
      })),
      {
        countryCode: 'PT',
        status: 'allowed' as const,
        reason: 'DEMO permitted example (Portugal)',
      },
    ],
  });
  await tx.featureFlag.createMany({ data: DEFAULT_FLAGS });
  await tx.affiliate.createMany({
    data: [
      ['AF-1021', 'Atlas Media', 'revenue_share', 'active'],
      ['AF-1007', 'Lumen Streams', 'revenue_share', 'active'],
      ['AF-1048', 'Juno Plays', 'hybrid', 'active'],
      ['AF-1033', 'Kestrel Reviews', 'cpa', 'active'],
      ['AF-1052', 'Pixelfox Media', 'revenue_share', 'active'],
      ['AF-1060', 'Tidewalker Crypto', 'revenue_share', 'review'],
      ['AF-1071', 'Northwind Gaming', 'revenue_share', 'active'],
      ['AF-1066', 'Sable Partners', 'revenue_share', 'on_hold'],
    ].map(([code, name, plan, status]) => ({
      code: code!,
      name: name!,
      plan: plan!,
      status: status!,
      isDemo: true,
    })),
  });
}

async function seedNova(tx: Tx) {
  const key = Buffer.from(process.env.TOTP_ENCRYPTION_KEY ?? '', 'base64');
  const totp = generateSecret();
  const u = DEMO.user;
  const onboarded = T('2026-03-14T09:12:00Z');
  await tx.user.create({
    data: {
      id: NOVA,
      privyUserId: NOVA_DID,
      publicId: u.publicId,
      handle: u.handle,
      email: u.email,
      emailVerified: true,
      onboardedAt: onboarded,
      lastLoginAt: T(DEMO.asOf),
      isDemo: true,
      createdAt: onboarded,
      profile: {
        create: {
          displayName: u.displayName,
          country: u.country.code,
          ageConfirmedAt: onboarded,
          jurisdictionConfirmedAt: onboarded,
          termsAcceptedAt: onboarded,
          termsVersion: '2026-11-demo',
          privacyAcceptedAt: onboarded,
          privacyVersion: '2026-11-demo',
          antiPhishingCode: u.security.antiPhishingCode,
          kycLevel: u.kyc.level,
          vipTier: u.vip.tier,
          vipLevel: u.vip.level,
          vipPoints: u.vip.points,
        },
      },
      totpSecret: {
        create: { secretEnc: encryptSecret(totp, key), status: 'active', confirmedAt: onboarded },
      },
      kycRecords: {
        create: {
          level: 'level_2',
          status: 'verified',
          provider: 'mock',
          submittedAt: T('2026-03-15T10:00:00Z'),
          reviewedAt: T('2026-03-15T10:40:00Z'),
          isDemo: true,
        },
      },
      rgSettings: { create: { realityCheckMinutes: DEMO.responsibleGaming.realityCheckMinutes } },
    },
  });
  await tx.userWallet.createMany({
    data: DEMO.wallets.map((w) => ({
      id: w.id,
      userId: NOVA,
      network: w.network,
      address: w.network === 'solana' ? w.address : w.address.toLowerCase(),
      source: w.status === 'connected' ? ('privy_linked' as const) : ('manual' as const),
      label: w.statusLabel,
      isPrimary: w.isPrimary,
      verifiedAt: w.status === 'verified' ? T('2026-09-02T10:00:00Z') : null,
      whitelistedAt: w.whitelisted ? T(w.whitelistedAt ?? '2026-09-02T10:00:00Z') : null,
      whitelistAvailableAt: w.whitelisted ? T(w.whitelistedAt ?? '2026-09-02T10:00:00Z') : null,
      isDemo: true,
    })),
  });
  await tx.session.createMany({
    data: DEMO.devices.map((d, i) => ({
      id: d.id,
      subject: 'user' as const,
      userId: NOVA,
      privySessionId: `demo-device-${i + 1}`,
      deviceLabel: `${d.device} · ${d.browser}`,
      location: d.location,
      flagged: d.flagged,
      flaggedReason: d.flaggedReason,
      lastSeenAt: d.flaggedAt ? T(d.flaggedAt) : T(DEMO.asOf),
      isDemo: true,
    })),
  });
  for (const l of DEMO.responsibleGaming.limits) {
    await tx.rgLimit.create({
      data: {
        userId: NOVA,
        type: l.type,
        period: l.period,
        amount: l.limit,
        pendingAmount: l.pendingIncrease?.amount ?? null,
        pendingEffectiveAt: l.pendingIncrease ? T(l.pendingIncrease.effectiveAt) : null,
        isDemo: true,
      },
    });
  }
  return totp;
}

function roundData(r: (typeof DEMO.previousRounds)[number]) {
  return {
    id: r.id,
    number: r.number,
    status: r.status,
    opensAt: T(r.openedAt),
    openedAt: T(r.openedAt),
    closesAt: T(r.closesAt),
    entryPrice: r.entryPrice,
    platformFeePerEntry: r.platformFeePerEntry,
    minParticipants: r.thresholds.minParticipants,
    minPool: r.thresholds.minPool,
    prizeSplitBps: [...DEFAULT_PRIZE_SPLIT_BPS],
    onchainRoundId: BigInt(r.number),
    isDemo: true,
  };
}

async function seedHistoryRounds(tx: Tx) {
  for (const r of DEMO.previousRounds) {
    const settled = r.status === 'settled';
    await tx.round.create({
      data: {
        ...roundData(r),
        closedAt: T(r.closesAt),
        // snapshot projections (historical rounds are not fully materialised in the DEMO seed)
        entriesCount: r.entries ?? 0,
        participantsCount: r.participants ?? 0,
        poolAmount: settled ? (r.poolBalance ?? '0') : '0',
        platformFees: r.platformFees ?? '0',
        thresholdsMet: r.thresholds.met,
        settledAt: settled ? new Date(T(r.closesAt).getTime() + 130_000) : null,
        cancelledAt: settled ? null : T(r.closesAt),
        cancelReason: settled ? null : 'threshold_not_met',
      },
    });
    for (const w of r.winners) {
      const winner = await tx.winner.create({
        data: {
          roundId: r.id,
          rank: w.place,
          tier: w.tier,
          userId: w.handle === 'nova.k' ? NOVA : null,
          handleSnapshot: w.handle,
          amount: w.amount,
          isDemo: true,
        },
      });
      if (w.handle === 'nova.k') {
        // already included in nova's aggregated opening balance → claimed
        await tx.prizeClaim.create({
          data: {
            winnerId: winner.id,
            userId: NOVA,
            amount: w.amount,
            status: 'claimed',
            claimedAt: T('2026-11-24T09:00:00Z'),
            isDemo: true,
          },
        });
      }
    }
    await ledger.ensureAccounts(tx, [{ type: 'pool', roundId: r.id }]);
  }
}

/** @nova.k's money history — every bucket is the sum of real, balanced postings. */
async function seedNovaLedger(tx: Tx) {
  const tr = (data: Omit<Prisma.TransactionUncheckedCreateInput, 'userId' | 'isDemo'>) =>
    tx.transaction.create({ data: { ...data, userId: NOVA, isDemo: true } });

  // 1. Aggregated history before the documented transactions (deposits, entries, prizes, rewards up to 1 Nov).
  const opening = '9668.55';
  await bulkPost(tx, [
    {
      kind: 'demo_opening_balance',
      description:
        'DEMO: aggregated account history before 1 Nov 2026 (deposits, entries, prizes, rewards)',
      reference: 'DEMO-OPENING-48213',
      eventKey: `demo:opening:${NOVA}`,
      createdAt: T('2026-11-01T00:00:00Z'),
      lines: [
        {
          account: { type: 'chain_clearing', network: 'arbitrum' },
          amount: `-${opening}`,
          userId: NOVA,
        },
        { account: { type: 'user_available', userId: NOVA }, amount: opening },
      ],
    },
  ]);

  // 2. Withdrawals: WD-20850 (rejected → returned), WD-20877 (confirmed), WD-20931 (under review → locked).
  const wds = [
    {
      number: 20850,
      network: 'polygon' as const,
      to: '0xa41c00000000000000000000000000000000d2e0',
      amount: '250.00',
      fee: '0.00',
      status: 'rejected' as const,
      at: '2026-11-18T16:02:00Z',
      end: '2026-11-18T16:22:00Z',
    },
    {
      number: 20877,
      network: 'bnb' as const,
      to: '0x12ab000000000000000000000000000000009f3c',
      amount: '800.00',
      fee: '0.12',
      status: 'confirmed' as const,
      at: '2026-11-20T11:05:00Z',
      end: '2026-11-20T11:32:00Z',
    },
    {
      number: 20931,
      network: 'arbitrum' as const,
      to: '0x7c4e00000000000000000000000000000000a21d',
      amount: '1500.00',
      fee: '0.08',
      status: 'under_review' as const,
      at: '2026-11-27T18:44:00Z',
      end: null,
    },
  ];
  for (const w of wds) {
    const net = toUSDTString(money(w.amount).minus(money(w.fee)));
    const wd = await tx.withdrawal.create({
      data: {
        number: w.number,
        userId: NOVA,
        network: w.network,
        toAddress: w.to,
        amount: w.amount,
        networkFee: w.fee,
        platformFee: '0.00',
        netAmount: w.status === 'rejected' ? '0.00' : net,
        status: w.status,
        riskLevel:
          w.status === 'rejected' ? 'critical' : w.status === 'under_review' ? 'medium' : 'low',
        riskFlags:
          w.status === 'under_review'
            ? ['destination_history']
            : w.status === 'rejected'
              ? ['sanctions_screening']
              : [],
        flagged: w.status !== 'confirmed',
        requiresFourEyes: w.status === 'under_review',
        idempotencyKey: `demo-wd-${w.number}`,
        txHash:
          w.status === 'confirmed'
            ? '0x88d2000000000000000000000000000000000000000000000000000000041bf'
            : null,
        broadcastAt: w.status === 'confirmed' ? T('2026-11-20T11:20:00Z') : null,
        confirmedAt: w.status === 'confirmed' ? T(w.end) : null,
        rejectedAt: w.status === 'rejected' ? T('2026-11-18T16:21:00Z') : null,
        rejectionReason:
          w.status === 'rejected' ? 'Destination flagged by sanctions screening' : null,
        isDemo: true,
        createdAt: T(w.at),
      },
    });
    const events: {
      from: WithdrawalStatus | null;
      to: WithdrawalStatus;
      note: string;
      at: string;
    }[] =
      w.status === 'under_review'
        ? [
            { from: null, to: 'requested', note: 'Submitted', at: '2026-11-27T18:44:00Z' },
            {
              from: 'requested',
              to: 'risk_check',
              note: 'Risk check passed (6 checks in 2.4 s)',
              at: '2026-11-27T18:44:01Z',
            },
            {
              from: 'risk_check',
              to: 'under_review',
              note: 'Routine AML screening for new destinations — usually under 4 h',
              at: '2026-11-27T18:44:03Z',
            },
          ]
        : w.status === 'confirmed'
          ? [
              { from: null, to: 'requested', note: 'Submitted', at: w.at },
              { from: 'requested', to: 'risk_check', note: 'Security checks', at: w.at },
              { from: 'risk_check', to: 'queued', note: 'Queued', at: w.at },
              { from: 'queued', to: 'broadcast', note: 'Sent', at: '2026-11-20T11:20:00Z' },
              { from: 'broadcast', to: 'confirmed', note: 'Completed', at: w.end },
            ]
          : [
              { from: null, to: 'requested', note: 'Requested', at: w.at },
              { from: 'requested', to: 'risk_check', note: 'Security checks', at: w.at },
              {
                from: 'risk_check',
                to: 'rejected',
                note: 'Rejected — sanctions screening · funds returned to Available',
                at: '2026-11-18T16:21:00Z',
              },
            ];
    await tx.withdrawalEvent.createMany({
      data: events.map((e) => ({
        withdrawalId: wd.id,
        fromStatus: e.from,
        toStatus: e.to,
        actorType: 'system' as const,
        note: e.note,
        createdAt: T(e.at),
      })),
    });
    const record = await tr({
      type: 'withdrawal',
      status:
        w.status === 'confirmed'
          ? 'completed'
          : w.status === 'rejected'
            ? 'rejected'
            : 'under_review',
      reference: `WD-${w.number}`,
      amount: w.amount,
      networkFee: w.fee,
      platformFee: '0.00',
      netAmount: w.status === 'rejected' ? '0.00' : net,
      direction: 'out',
      network: w.network,
      txHash: wd.txHash,
      description: `Withdrawal · ${w.network === 'bnb' ? 'BNB Chain' : w.network === 'polygon' ? 'Polygon' : 'Arbitrum'}`,
      withdrawalId: wd.id,
      createdAt: T(w.at),
      completedAt: w.end ? T(w.end) : null,
      metadata: {
        address: w.to,
        statusDetail:
          w.status === 'under_review'
            ? 'Routine AML screening for new destinations — usually under 4 h'
            : w.status === 'rejected'
              ? 'Destination flagged by sanctions screening — funds returned to Available'
              : 'Completed',
      },
    });
    const postings: SeedPosting[] = [
      {
        kind: 'withdrawal_lock',
        description: `WD-${w.number} requested — funds locked`,
        reference: `WD-${w.number}`,
        eventKey: `withdrawal:${wd.id}:lock`,
        transactionId: record.id,
        createdAt: T(w.at),
        lines: withdrawalLockLines(NOVA, w.amount),
      },
    ];
    if (w.status === 'rejected') {
      postings.push({
        kind: 'withdrawal_release',
        description: `WD-${w.number} rejected — funds returned`,
        reference: `WD-${w.number}`,
        eventKey: `withdrawal:${wd.id}:release`,
        transactionId: record.id,
        createdAt: T(w.end),
        lines: withdrawalReleaseLines(NOVA, w.amount),
      });
    }
    if (w.status === 'confirmed') {
      postings.push({
        kind: 'withdrawal_settle',
        description: `WD-${w.number} confirmed`,
        reference: `WD-${w.number}`,
        eventKey: `withdrawal:${wd.id}:settle`,
        transactionId: record.id,
        createdAt: T(w.end),
        lines: withdrawalSettleLines(NOVA, w.network, {
          amount: w.amount,
          networkFee: w.fee,
          platformFee: '0.00',
        }),
      });
    }
    await bulkPost(tx, postings);
    if (w.status === 'under_review') {
      await tx.amlAlert.create({
        data: {
          userId: NOVA,
          withdrawalId: wd.id,
          riskLevel: 'medium',
          rule: 'destination_history',
          status: 'open',
          details: {
            provider: 'mock',
            decision: 'review',
            reason: 'Routine AML screening for new destinations — usually under 4 h',
            checks: 6,
            durationMs: 2400,
          },
          isDemo: true,
          createdAt: T('2026-11-27T18:44:03Z'),
        },
      });
    }
  }

  // 3. Deposits: DP-77380 credited (BNB), DP-77412 confirming 7 / 12 (Ethereum) → Pending.
  const deposits = [
    {
      number: 77380,
      network: 'bnb' as const,
      amount: '2500.00',
      tx: '0x41aa000000000000000000000000000000000000000000000000000000007d10',
      conf: 15,
      req: 15,
      credited: true,
      at: '2026-11-24T10:05:00Z',
    },
    {
      number: 77412,
      network: 'ethereum' as const,
      amount: '1000.00',
      tx: '0x5e1f00000000000000000000000000000000000000000000000000000000c0a8',
      conf: 7,
      req: 12,
      credited: false,
      at: '2026-11-27T18:40:12Z',
    },
  ];
  for (const d of deposits) {
    const dep = await tx.deposit.create({
      data: {
        number: d.number,
        userId: NOVA,
        network: d.network,
        txHash: d.tx,
        toAddress: '0x12ab000000000000000000000000000000009f3c',
        amount: d.amount,
        amountOnchain: d.amount,
        confirmations: d.conf,
        requiredConfirmations: d.req,
        status: d.credited ? 'credited' : 'confirming',
        detectedAt: T(d.at),
        creditedAt: d.credited ? T(d.at) : null,
        isDemo: true,
        createdAt: T(d.at),
      },
    });
    const record = await tr({
      type: 'deposit',
      status: d.credited ? 'completed' : 'confirming',
      reference: `DP-${d.number}`,
      amount: d.amount,
      platformFee: '0.00',
      netAmount: d.amount,
      direction: 'in',
      network: d.network,
      txHash: d.tx,
      description: `Deposit · ${d.network === 'bnb' ? 'BNB Chain' : 'Ethereum'}`,
      depositId: dep.id,
      createdAt: T(d.at),
      completedAt: d.credited ? T(d.at) : null,
      metadata: {
        statusDetail: d.credited
          ? `Credited ${formatDate(T(d.at))}`
          : `${d.conf} / ${d.req} confirmations · est. 2 min`,
      },
    });
    const postings: SeedPosting[] = [
      {
        kind: 'deposit_detected',
        description: `DP-${d.number} detected`,
        reference: `DP-${d.number}`,
        eventKey: `deposit:${dep.id}:detected`,
        transactionId: record.id,
        createdAt: T(d.at),
        lines: depositDetectedLines(NOVA, d.network, d.amount),
      },
    ];
    if (d.credited) {
      postings.push({
        kind: 'deposit_credited',
        description: `DP-${d.number} credited`,
        reference: `DP-${d.number}`,
        eventKey: `deposit:${dep.id}:credited`,
        transactionId: record.id,
        createdAt: T(d.at),
        lines: depositCreditedLines(NOVA, d.amount),
      });
    }
    await bulkPost(tx, postings);
  }

  // 4. Round #1,245 (cancelled, threshold not met): 30 entries 301.50 → 300.00 refunded to Owed (fee kept).
  const r1245 = DEMO.previousRounds.find((r) => r.number === 1245)!;
  const q30 = entryQuote(30);
  const p1245 = await tr({
    type: 'entry_purchase',
    status: 'completed',
    reference: 'EP-1245-02001-02030',
    amount: q30.entryAmount,
    networkFee: '0.00',
    platformFee: q30.platformFee,
    netAmount: q30.total,
    direction: 'out',
    description: '30 entries · Round #1,245',
    roundId: r1245.id,
    createdAt: T('2026-11-24T12:30:00Z'),
    completedAt: T('2026-11-24T12:30:00Z'),
    metadata: {
      entries: 30,
      statusDetail: `Entries ${q30.entryAmount} + platform fee ${q30.platformFee}`,
    },
  });
  const [buy1245, refund1245] = await bulkPost(tx, [
    {
      kind: 'entry_purchase',
      description: '30 entries in round #1,245',
      reference: p1245.reference,
      eventKey: `entry_purchase:${p1245.id}`,
      transactionId: p1245.id,
      roundId: r1245.id,
      createdAt: T('2026-11-24T12:30:00Z'),
      lines: entryPurchaseLines(NOVA, r1245.id, q30),
    },
    {
      kind: 'round_refund',
      description: 'Round #1,245 cancelled (threshold_not_met) — stakes refunded to Owed',
      reference: 'round:1245',
      eventKey: `round:${r1245.id}:refund`,
      roundId: r1245.id,
      createdAt: T(r1245.closesAt),
      lines: roundRefundLines(r1245.id, [{ userId: NOVA, amount: q30.entryAmount }]),
    },
  ]);
  await tx.entry.createMany({
    data: Array.from({ length: 30 }, (_, i) => ({
      roundId: r1245.id,
      userId: NOVA,
      seq: 2001 + i,
      code: `E-1245-${String(2001 + i).padStart(5, '0')}`,
      status: 'refund_owed' as const,
      transactionId: p1245.id,
      isDemo: true,
      createdAt: T('2026-11-24T12:30:00Z'),
    })),
  });
  await tx.poolLedger.createMany({
    data: [
      {
        roundId: r1245.id,
        postingId: buy1245!,
        userId: NOVA,
        kind: 'entry',
        entryCount: 30,
        amount: q30.entryAmount,
        createdAt: T('2026-11-24T12:30:00Z'),
      },
      {
        roundId: r1245.id,
        postingId: refund1245!,
        userId: NOVA,
        kind: 'refund',
        entryCount: 30,
        amount: `-${q30.entryAmount}`,
        createdAt: T(r1245.closesAt),
      },
    ],
  });
  await tx.feeLedger.create({
    data: {
      postingId: buy1245!,
      userId: NOVA,
      roundId: r1245.id,
      kind: 'platform_entry_fee',
      entryCount: 30,
      amount: q30.platformFee,
      createdAt: T('2026-11-24T12:30:00Z'),
    },
  });
  await tr({
    type: 'refund',
    status: 'pending',
    reference: `RF-1245-${NOVA}`,
    amount: '300.00',
    platformFee: '0.00',
    netAmount: '300.00',
    direction: 'in',
    description: 'Refund · cancelled round #1,245 (30 entries)',
    roundId: r1245.id,
    createdAt: T(r1245.closesAt),
    metadata: {
      entries: 30,
      reason: 'threshold_not_met',
      statusDetail: 'Owed — claim to move it to Available',
    },
  });

  // 5. VIP Gold weekly reward 115.20 (16–22 Nov) → Owed.
  const reward = await tr({
    type: 'reward',
    status: 'pending',
    reference: 'RW-VIP-2026-11-16',
    amount: '115.20',
    platformFee: '0.00',
    netAmount: '115.20',
    direction: 'in',
    description: 'VIP Gold weekly reward (16–22 Nov)',
    createdAt: T('2026-11-23T10:00:00Z'),
    metadata: { statusDetail: 'Owed — auto-settles Mon 30 Nov 2026 10:00 UTC' },
  });
  await bulkPost(tx, [
    {
      kind: 'reward',
      description: 'VIP Gold weekly reward 16–22 Nov (DEMO)',
      reference: reward.reference,
      eventKey: `reward:${reward.id}`,
      transactionId: reward.id,
      createdAt: T('2026-11-23T10:00:00Z'),
      lines: [
        { account: { type: 'operator_revenue' }, amount: '-115.20', userId: NOVA },
        { account: { type: 'user_owed', userId: NOVA }, amount: '115.20' },
      ],
    },
  ]);
}

/** Round #1,248 OPEN: 3,412 participants, 18,640 entries — @nova.k's 35 at E-1248-00981 … 01015. */
async function seedCurrentRound(tx: Tx) {
  const r = DEMO.currentRound;
  await tx.round.create({ data: { ...roundData(r), status: 'open' } });
  const opens = T(r.openedAt).getTime();
  const novaAt = T(DEMO.myEntries.purchasedAt).getTime();
  const lastAt = T('2026-11-27T18:42:00Z').getTime();

  // Crowd (DEMO users). Named fictional handles first, then generic DEMO players.
  const named = DEMO_HANDLES.filter(
    (h) => !['nova.k', 'juno88', 'atlas_q', 'pixelfox', 'tidewalker'].includes(h),
  );
  const feed = DEMO.entriesFeed.slice().reverse(); // oldest → newest
  type Buyer = { id: string; handle: string | null; entries: number; at: number };
  const before: Buyer[] = [];
  const after: Buyer[] = [];
  let n = 0;
  const makeId = () => demoId('user', 100_001 + n++);
  for (let i = 0; i < 196; i++)
    before.push({
      id: makeId(),
      handle: `player_${String(n).padStart(4, '0')}`,
      entries: 5,
      at: opens + Math.floor(((novaAt - opens) * (i + 1)) / 197),
    });
  const big = 3210;
  for (let i = 0; i < big; i++) {
    const handle = i < named.length ? named[i]! : `player_${String(n + 1).padStart(4, '0')}`;
    after.push({
      id: makeId(),
      handle,
      entries: i < 1537 ? 6 : 5,
      at: novaAt + 60_000 + Math.floor(((lastAt - novaAt - 60_000) * i) / big),
    });
  }
  const feedBuyers: Buyer[] = feed.map((f) => ({
    id: makeId(),
    handle: f.handle,
    entries: f.entries,
    at: T(f.at).getTime(),
  }));
  const crowd = [...before, ...after, ...feedBuyers];

  await tx.user.createMany({
    data: crowd.map((c, i) => ({
      id: c.id,
      publicId: `GP-D${String(i + 1).padStart(5, '0')}`,
      handle: c.handle,
      onboardedAt: T('2026-10-01T00:00:00Z'),
      isDemo: true,
    })),
  });
  const countries = ['PT', 'ES', 'DE', 'FR', 'GB', 'NL', 'IT', 'SE', 'PL', 'IE'];
  await tx.userProfile.createMany({
    data: crowd.map((c, i) => ({
      userId: c.id,
      country: countries[i % countries.length],
      ageConfirmedAt: T('2026-10-01T00:00:00Z'),
      termsAcceptedAt: T('2026-10-01T00:00:00Z'),
      privacyAcceptedAt: T('2026-10-01T00:00:00Z'),
      jurisdictionConfirmedAt: T('2026-10-01T00:00:00Z'),
      termsVersion: '2026-11-demo',
      privacyVersion: '2026-11-demo',
    })),
  });

  // Funding: one balanced posting crediting each DEMO player exactly the cost of their purchase.
  const fundTotal = crowd.reduce(
    (acc, c) => acc.plus(money(entryQuote(c.entries).total)),
    money(0),
  );
  await bulkPost(tx, [
    {
      kind: 'demo_opening_balance',
      description: `DEMO: opening balances for ${crowd.length} DEMO players of round #1,248`,
      reference: 'DEMO-CROWD-1248',
      eventKey: 'demo:crowd:1248',
      createdAt: T('2026-11-27T07:59:00Z'),
      lines: [
        {
          account: { type: 'chain_clearing', network: 'arbitrum' },
          amount: toUSDTString(fundTotal.negated()),
        },
        ...crowd.map((c) => ({
          account: { type: 'user_available' as const, userId: c.id },
          amount: entryQuote(c.entries).total,
        })),
      ],
    },
  ]);

  // Purchases in chronological order → canonical seq order.
  const purchases = [
    ...before.map((b) => ({ ...b, nova: false })),
    { id: NOVA, handle: 'nova.k', entries: DEMO.myEntries.entries, at: novaAt, nova: true },
    ...after.map((b) => ({ ...b, nova: false })),
    ...feedBuyers.map((b) => ({ ...b, nova: false })),
  ];
  let seq = 1;
  const txRows: Prisma.TransactionCreateManyInput[] = [];
  const postings: SeedPosting[] = [];
  const entryRows: Prisma.EntryCreateManyInput[] = [];
  const meta: {
    userId: string;
    entries: number;
    amount: string;
    fee: string;
    txId: string;
    at: Date;
  }[] = [];
  for (const p of purchases) {
    const q = entryQuote(p.entries);
    const first = seq;
    const last = seq + p.entries - 1;
    const txId = randomUUID();
    const at = new Date(p.at);
    const reference = `EP-1248-${String(first).padStart(5, '0')}-${String(last).padStart(5, '0')}`;
    txRows.push({
      id: txId,
      userId: p.id,
      type: 'entry_purchase',
      status: 'completed',
      reference,
      amount: q.entryAmount,
      networkFee: '0.00',
      platformFee: q.platformFee,
      netAmount: q.total,
      direction: 'out',
      description: `${p.entries} ${p.entries === 1 ? 'entry' : 'entries'} · Round #1,248`,
      roundId: r.id,
      txHash: p.nova ? '0x3a7c00000000000000000000000000000000000000000000000000000009e02' : null,
      isDemo: true,
      createdAt: at,
      completedAt: at,
      metadata: {
        entries: p.entries,
        firstEntryId: `E-1248-${String(first).padStart(5, '0')}`,
        lastEntryId: `E-1248-${String(last).padStart(5, '0')}`,
        statusDetail: `Entries ${q.entryAmount} + platform fee ${q.platformFee}`,
      },
    });
    postings.push({
      kind: 'entry_purchase',
      description: `${p.entries} entries in round #1,248`,
      reference,
      eventKey: `entry_purchase:${txId}`,
      transactionId: txId,
      roundId: r.id,
      createdAt: at,
      lines: entryPurchaseLines(p.id, r.id, q),
    });
    for (let s = first; s <= last; s++) {
      entryRows.push({
        roundId: r.id,
        userId: p.id,
        seq: s,
        code: `E-1248-${String(s).padStart(5, '0')}`,
        transactionId: txId,
        isDemo: true,
        createdAt: at,
      });
    }
    meta.push({
      userId: p.id,
      entries: p.entries,
      amount: q.entryAmount,
      fee: q.platformFee,
      txId,
      at,
    });
    seq = last + 1;
  }
  for (let i = 0; i < txRows.length; i += 2000)
    await tx.transaction.createMany({ data: txRows.slice(i, i + 2000) });
  const postingIds = await bulkPost(tx, postings);
  for (let i = 0; i < entryRows.length; i += 5000)
    await tx.entry.createMany({ data: entryRows.slice(i, i + 5000) });
  await tx.poolLedger.createMany({
    data: meta.map((m, i) => ({
      roundId: r.id,
      postingId: postingIds[i]!,
      userId: m.userId,
      kind: 'entry',
      entryCount: m.entries,
      amount: m.amount,
      createdAt: m.at,
    })),
  });
  await tx.feeLedger.createMany({
    data: meta.map((m, i) => ({
      postingId: postingIds[i]!,
      userId: m.userId,
      roundId: r.id,
      kind: 'platform_entry_fee',
      entryCount: m.entries,
      amount: m.fee,
      createdAt: m.at,
    })),
  });

  const totalEntries = seq - 1;
  const pool = toUSDTString(money(ENTRY).times(totalEntries));
  await tx.round.update({
    where: { id: r.id },
    data: {
      entriesCount: totalEntries,
      participantsCount: purchases.length,
      poolAmount: pool,
      platformFees: toUSDTString(money('0.05').times(totalEntries)),
    },
  });
  return { totalEntries, participants: purchases.length, pool };
}

async function seedNotifications(tx: Tx) {
  await tx.notification.createMany({
    data: [
      {
        type: 'withdrawal.under_review',
        title: 'Withdrawal under review',
        body: 'WD-20931: Routine AML screening for new destinations — usually under 4 h.',
        at: '2026-11-27T18:44:03Z',
      },
      {
        type: 'deposit.detected',
        title: 'Deposit detected',
        body: 'DP-77412: 1,000.00 USDT — 7 / 12 confirmations.',
        at: '2026-11-27T18:40:12Z',
      },
      {
        type: 'round.entries_confirmed',
        title: 'Entries confirmed',
        body: '35 entries in round #1,248 (E-1248-00981 … E-1248-01015).',
        at: '2026-11-27T14:06:00Z',
      },
    ].map((n) => ({
      userId: NOVA,
      type: n.type,
      title: n.title,
      body: n.body,
      isDemo: true,
      createdAt: T(n.at),
    })),
  });
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function main() {
  if (process.env.DEMO_MODE !== 'true') {
    console.info('DEMO_MODE is not "true" — skipping the DEMO seed.');
    return;
  }
  if (process.env.REAL_MONEY_ENABLED === 'true')
    throw new Error('Refusing to seed DEMO data with REAL_MONEY_ENABLED=true');
  if (await prisma.user.findUnique({ where: { id: NOVA } })) {
    console.info('DEMO data already present — verifying and refreshing the dev credential files.');
    console.info(
      '(For a fresh DEMO database run `pnpm --filter @gp/api db:reset` yourself — it drops all data.)',
    );
    await finalize(Date.now());
    return;
  }
  if ((await prisma.ledgerPosting.count()) > 0 || (await prisma.round.count()) > 0) {
    throw new Error(
      'Database is not empty (ledger rows / rounds exist). The append-only ledger cannot be cleaned — run `pnpm --filter @gp/api db:reset`.',
    );
  }
  const started = Date.now();
  console.info(
    `Seeding DEMO data (time shift +${SHIFT_DAYS} day(s); current round closes ${T(DEMO.currentRound.closesAt).toISOString()})…`,
  );
  await prisma.$transaction(
    async (tx) => {
      await seedRbacAndAdmins(tx);
      await seedCatalogue(tx);
      await seedNova(tx);
      await seedHistoryRounds(tx);
      await seedNovaLedger(tx);
      await seedCurrentRound(tx);
      await seedNotifications(tx);
      for (const t of ['deposits', 'withdrawals']) {
        await tx.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('${t}', 'number'), (SELECT COALESCE(MAX(number), 1) FROM ${t}))`,
        );
      }
    },
    { timeout: 600_000, maxWait: 30_000 },
  );
  await finalize(started);
}

/** Verify balances / reconciliation, record the seed in the audit chain, write the dev credential files. */
async function finalize(started: number) {
  const key = Buffer.from(process.env.TOTP_ENCRYPTION_KEY ?? '', 'base64');
  const round = await prisma.round.findUniqueOrThrow({
    where: { number: DEMO.currentRound.number },
  });
  const roundStats = {
    number: round.number,
    status: round.status,
    closesAt: round.closesAt.toISOString(),
    entries: round.entriesCount,
    participants: round.participantsCount,
    pool: round.poolAmount.toFixed(2),
    platformFees: round.platformFees.toFixed(2),
  };
  if (!(await prisma.auditLog.findFirst({ where: { action: 'system.demo_seed.loaded' } }))) {
    const audit = new AuditService(prisma as unknown as PrismaService);
    await prisma.$transaction((tx) =>
      audit.record(
        {
          actorType: 'system',
          actorLabel: 'seed',
          action: 'system.demo_seed.loaded',
          metadata: { shiftDays: SHIFT_DAYS, round: roundStats },
        },
        tx,
      ),
    );
  }
  const password = process.env.ADMIN_SEED_PASSWORD || 'GlobalPool-Demo-2026!';
  const adminRows = await prisma.adminUser.findMany({
    where: { isDemo: true },
    include: { totpSecret: true, roles: { include: { role: true } } },
    orderBy: { email: 'asc' },
  });
  const admins = adminRows.map((a) => {
    const secret = a.totpSecret ? decryptSecret(a.totpSecret.secretEnc, key) : null;
    return {
      name: a.name,
      title: a.title,
      roles: a.roles.map((r) => r.role.key),
      email: a.email,
      password,
      totpSecret: secret,
      otpauthUrl: secret
        ? generateURI({
            issuer: process.env.TOTP_ISSUER ?? 'GLOBAL POOL (DEMO)',
            label: a.email,
            secret,
          })
        : null,
    };
  });
  const novaSecret = await prisma.totpSecret.findUnique({ where: { userId: NOVA } });
  const balances = await ledger.userBalances(NOVA);
  const reconciliation = await ledger.reconcile();
  const dir = resolve(findApiRoot(), '.dev');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, 'demo-admins.json'),
    JSON.stringify(
      { note: 'DEV ONLY — DEMO admin credentials (password + TOTP secret). Git-ignored.', admins },
      null,
      2,
    ),
  );
  writeFileSync(
    resolve(dir, 'demo-player.json'),
    JSON.stringify(
      {
        note: 'DEV ONLY — DEMO player @nova.k. Get a token: POST /auth/dev/token {"did":"did:privy:demo-nova-k"}',
        did: NOVA_DID,
        handle: 'nova.k',
        totpSecret: novaSecret ? decryptSecret(novaSecret.secretEnc, key) : null,
      },
      null,
      2,
    ),
  );
  console.info(
    `@nova.k balances: ${JSON.stringify({ available: balances.available, locked: balances.locked, pending: balances.pending, owed: balances.owed, total: balances.total })}`,
  );
  console.info(`Round ${formatRoundNumber(round.number)}: ${JSON.stringify(roundStats)}`);
  console.info(`Ledger reconciliation: ${JSON.stringify(reconciliation)}`);
  console.info(
    `DEMO credentials written to ${dir}/demo-admins.json and demo-player.json (${((Date.now() - started) / 1000).toFixed(1)} s)`,
  );
  if (balances.total !== '12480.50' || !reconciliation.ok) {
    throw new Error(
      `DEMO seed does not reconcile: total ${balances.total}, reconciliation ok=${reconciliation.ok}`,
    );
  }
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
