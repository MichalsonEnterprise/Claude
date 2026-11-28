import { Injectable } from '@nestjs/common';
import type { KycStatus, Prisma } from '@prisma/client';
import { KYC_LEVEL_LABEL, KYC_LEVEL_RANK, type KycLevel } from '@gp/shared/enums';
import { DAILY_WITHDRAWAL_LIMIT } from '@gp/shared/limits';
import {
  paginate,
  type AdminAmlQuery,
  type AdminKycQuery,
  type KycDecision,
} from '@gp/shared/schemas';

import { AppError, notFound } from '../../common/errors';
import { usdt } from '../../common/money';
import type { AuthAdmin, RequestMeta } from '../../common/request';
import { addHours } from '../../common/time';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TotpService } from '../security/totp.service';
import { maskEmail } from '../users/users.service';
import { atHandle } from './admin-finance.service';

/** KYC review SLA (hours from submission). */
export const KYC_SLA_HOURS = 48;
const OPEN_KYC: KycStatus[] = ['pending', 'in_review', 'resubmission_required'];
const OPEN_AML = ['open', 'under_review', 'escalated'] as const;
const kycRef = (id: string) => `KYC-${id.slice(0, 6).toUpperCase()}`;
const amlRef = (id: string) => `AML-${id.slice(0, 4).toUpperCase()}`;

/** Risk score (0–100) shown as Admin/Risk Score Meter — a read-only model output, never editable. */
export function riskScore(level: string | null | undefined): number {
  switch (level ?? 'none') {
    case 'critical':
      return 91;
    case 'high':
      return 72;
    case 'medium':
      return 46;
    case 'low':
      return 18;
    default:
      return 0;
  }
}

/**
 * Compliance back-office (ADM-C1 KYC queue + review, ADM-C2 AML alerts). KYC decisions are the only writes:
 * reason + fresh MFA, audited, and the player is notified. Approving raises the KYC level (which only changes
 * the withdrawal limit); nothing here touches balances.
 */
@Injectable()
export class AdminComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly totp: TotpService,
    private readonly notifications: NotificationsService,
  ) {}

  async kycQueue(query: AdminKycQuery, now = new Date()) {
    const q = query.q?.replace(/^@/, '').toLowerCase();
    const where: Prisma.KycRecordWhereInput = {
      ...(query.status ? { status: query.status } : { status: { in: OPEN_KYC } }),
      ...(query.level ? { level: query.level } : {}),
      ...(q
        ? {
            OR: [
              { user: { handle: { contains: q } } },
              { user: { publicId: { equals: q.toUpperCase() } } },
            ],
          }
        : {}),
    };
    const [rows, total, byStatus, oldest, decided24h] = await Promise.all([
      this.prisma.kycRecord.findMany({
        where,
        orderBy: [{ submittedAt: 'asc' }, { createdAt: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          user: {
            select: {
              id: true,
              handle: true,
              publicId: true,
              isDemo: true,
              profile: { select: { country: true, kycLevel: true } },
              amlAlerts: { where: { status: { in: [...OPEN_AML] } }, select: { riskLevel: true } },
            },
          },
        },
      }),
      this.prisma.kycRecord.count({ where }),
      this.prisma.kycRecord.groupBy({ by: ['status'], _count: true }),
      this.prisma.kycRecord.findFirst({
        where: { status: { in: OPEN_KYC } },
        orderBy: [{ submittedAt: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.kycRecord.count({
        where: {
          reviewedAt: { gte: addHours(now, -24) },
          status: { in: ['verified', 'rejected'] },
        },
      }),
    ]);
    const c = (s: KycStatus) => byStatus.find((b) => b.status === s)?._count ?? 0;
    const breached = await this.prisma.kycRecord.count({
      where: { status: { in: OPEN_KYC }, submittedAt: { lt: addHours(now, -KYC_SLA_HOURS) } },
    });
    const open = c('pending') + c('in_review') + c('resubmission_required');
    return {
      summary: {
        open,
        pending: c('pending'),
        inReview: c('in_review'),
        resubmission: c('resubmission_required'),
        verified: c('verified'),
        rejected: c('rejected'),
        decided24h,
        slaHours: KYC_SLA_HOURS,
        slaBreached: breached,
        oldestHours: oldest
          ? Math.floor(
              (now.getTime() - (oldest.submittedAt ?? oldest.createdAt).getTime()) / 3_600_000,
            )
          : null,
      },
      ...paginate(
        rows.map((r) => {
          const submitted = r.submittedAt ?? r.createdAt;
          const due = addHours(submitted, KYC_SLA_HOURS);
          const topRisk = r.user.amlAlerts
            .map((a) => a.riskLevel)
            .sort((a, b) => riskScore(b) - riskScore(a))[0];
          return {
            id: r.id,
            reference: kycRef(r.id),
            user: {
              id: r.user.id,
              handle: atHandle(r.user.handle),
              publicId: r.user.publicId,
              country: r.user.profile?.country ?? null,
              currentLevel: r.user.profile?.kycLevel ?? 'none',
            },
            level: r.level,
            levelLabel: KYC_LEVEL_LABEL[r.level],
            status: r.status,
            provider: r.provider,
            submittedAt: submitted.toISOString(),
            slaDueAt: due.toISOString(),
            slaHoursLeft: OPEN_KYC.includes(r.status)
              ? Math.floor((due.getTime() - now.getTime()) / 3_600_000)
              : null,
            riskLevel: topRisk ?? 'low',
            isDemo: r.isDemo || r.user.isDemo,
          };
        }),
        total,
        query,
      ),
      generatedAt: now.toISOString(),
    };
  }

  async kycDetail(id: string, now = new Date()) {
    const r = await this.prisma.kycRecord.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            profile: true,
            amlAlerts: { orderBy: { createdAt: 'desc' }, take: 5 },
            restrictions: { where: { liftedAt: null } },
            kycRecords: { orderBy: { createdAt: 'desc' }, take: 10 },
          },
        },
      },
    });
    if (!r) throw notFound('KYC record');
    const [balances, audit, deposits, withdrawals] = await Promise.all([
      this.ledger.userBalances(r.userId),
      this.prisma.auditLog.findMany({
        where: { targetType: 'kyc_record', targetId: id },
        orderBy: { seq: 'asc' },
      }),
      this.prisma.deposit.aggregate({
        where: { userId: r.userId, status: 'credited' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.withdrawal.aggregate({
        where: { userId: r.userId, status: 'confirmed' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);
    const submitted = r.submittedAt ?? r.createdAt;
    const due = addHours(submitted, KYC_SLA_HOURS);
    const u = r.user;
    const topAlert = [...u.amlAlerts].sort(
      (a, b) => riskScore(b.riskLevel) - riskScore(a.riskLevel),
    )[0];
    const currentLevel = u.profile?.kycLevel ?? 'none';
    return {
      id: r.id,
      reference: kycRef(r.id),
      level: r.level,
      levelLabel: KYC_LEVEL_LABEL[r.level],
      status: r.status,
      provider: r.provider,
      providerRef: r.providerRef,
      submittedAt: submitted.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      rejectionReason: r.rejectionReason,
      sla: {
        hours: KYC_SLA_HOURS,
        dueAt: due.toISOString(),
        hoursLeft: Math.floor((due.getTime() - now.getTime()) / 3_600_000),
      },
      canDecide: OPEN_KYC.includes(r.status),
      user: {
        id: u.id,
        handle: atHandle(u.handle),
        publicId: u.publicId,
        emailMasked: maskEmail(u.email),
        country: u.profile?.country ?? null,
        dateOfBirthMasked: u.profile?.dateOfBirth
          ? `••/••/${u.profile.dateOfBirth.getUTCFullYear()}`
          : null,
        memberSince: u.createdAt.toISOString(),
        status: u.status,
        currentLevel,
        currentLevelLabel: KYC_LEVEL_LABEL[currentLevel],
        restrictions: u.restrictions.map((x) => x.type),
        isDemo: u.isDemo,
      },
      limits: {
        current: DAILY_WITHDRAWAL_LIMIT[currentLevel],
        afterApproval: DAILY_WITHDRAWAL_LIMIT[r.level],
        byLevel: (Object.keys(DAILY_WITHDRAWAL_LIMIT) as KycLevel[]).map((level) => ({
          level,
          label: KYC_LEVEL_LABEL[level],
          dailyWithdrawal: DAILY_WITHDRAWAL_LIMIT[level],
        })),
      },
      checks: [
        {
          key: 'provider',
          label: `Provider result (${r.provider})`,
          ok: r.status !== 'rejected',
          detail: r.providerRef ? `Session ${r.providerRef}` : 'Mock provider — DEMO',
        },
        {
          key: 'sanctions',
          label: 'Sanctions & PEP screening',
          ok: !u.amlAlerts.some((a) => a.rule.includes('sanction')),
          detail: u.amlAlerts.some((a) => a.rule.includes('sanction'))
            ? 'Hit — see AML alerts'
            : 'No match',
        },
        {
          key: 'age',
          label: 'Age 18+',
          ok: Boolean(u.onboardedAt),
          detail: u.onboardedAt ? 'Confirmed at onboarding' : 'Not confirmed',
        },
        {
          key: 'country',
          label: 'Permitted country of residence',
          ok: Boolean(u.profile?.country),
          detail: u.profile?.country ?? 'Unknown',
        },
      ],
      risk: {
        score: riskScore(topAlert?.riskLevel ?? 'low'),
        level: topAlert?.riskLevel ?? 'low',
        factors: u.amlAlerts.slice(0, 3).map((a) => a.rule),
      },
      activity: {
        balances,
        deposits: { count: deposits._count, amount: usdt(deposits._sum.amount) },
        withdrawals: { count: withdrawals._count, amount: usdt(withdrawals._sum.amount) },
      },
      history: u.kycRecords.map((k) => ({
        id: k.id,
        reference: kycRef(k.id),
        level: k.level,
        status: k.status,
        submittedAt: (k.submittedAt ?? k.createdAt).toISOString(),
        reviewedAt: k.reviewedAt?.toISOString() ?? null,
        rejectionReason: k.rejectionReason,
      })),
      amlAlerts: u.amlAlerts.map((a) => ({
        id: a.id,
        reference: amlRef(a.id),
        riskLevel: a.riskLevel,
        rule: a.rule,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
      })),
      audit: audit.map((x) => ({
        seq: x.seq.toString(),
        action: x.action,
        actorLabel: x.actorLabel,
        reason: x.reason,
        createdAt: x.createdAt.toISOString(),
        hash: x.hash,
      })),
      documentsNote:
        'Document images stay with the KYC provider; this console shows the provider result only (no document storage in this build).',
      isDemo: r.isDemo || u.isDemo,
    };
  }

  async kycDecision(admin: AuthAdmin, id: string, input: KycDecision, meta: RequestMeta) {
    if (!admin.permissions.includes('kyc.review')) {
      throw new AppError('FORBIDDEN', 'Your role does not allow this action', {
        missingPermissions: ['kyc.review'],
      });
    }
    const record = await this.prisma.kycRecord.findUnique({ where: { id } });
    if (!record) throw notFound('KYC record');
    if (!OPEN_KYC.includes(record.status))
      throw new AppError('CONFLICT', `This KYC record is already ${record.status}`);
    // Policy: kyc.review needs a reason; this console also requires a fresh authenticator code (stricter).
    await this.totp.verifyActive({ adminUserId: admin.id }, input.mfaCode, { allowBackup: false });
    const now = new Date();
    const status: KycStatus =
      input.decision === 'approve'
        ? 'verified'
        : input.decision === 'reject'
          ? 'rejected'
          : 'resubmission_required';
    return this.prisma.tx(async (tx) => {
      const updated = await tx.kycRecord.updateMany({
        where: { id, status: { in: OPEN_KYC } },
        data: {
          status,
          reviewedAt: now,
          reviewerAdminId: admin.id,
          rejectionReason: input.decision === 'approve' ? null : input.reason,
        },
      });
      if (updated.count !== 1)
        throw new AppError('CONFLICT', 'This KYC record was already decided');
      let newLevel: KycLevel | null = null;
      if (input.decision === 'approve') {
        const profile = await tx.userProfile.findUnique({ where: { userId: record.userId } });
        const current = profile?.kycLevel ?? 'none';
        if (KYC_LEVEL_RANK[record.level] > KYC_LEVEL_RANK[current]) {
          await tx.userProfile.update({
            where: { userId: record.userId },
            data: { kycLevel: record.level },
          });
          newLevel = record.level;
        }
      }
      const audit = await this.audit.record(
        {
          actorType: 'admin',
          actorId: admin.id,
          actorLabel: admin.name,
          action: `kyc.${input.decision}`,
          targetType: 'kyc_record',
          targetId: id,
          reason: input.reason,
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
          metadata: {
            userId: record.userId,
            level: record.level,
            status,
            reasonCategory: input.reasonCategory ?? null,
            newLevel,
          },
        },
        tx,
      );
      await this.notifications.notify(tx, {
        userId: record.userId,
        type: input.decision === 'approve' ? 'kyc.approved' : 'kyc.resubmission_required',
        title:
          input.decision === 'approve'
            ? 'Verification approved'
            : input.decision === 'reject'
              ? 'Verification not approved'
              : 'More information needed for verification',
        body:
          input.decision === 'approve'
            ? `${KYC_LEVEL_LABEL[record.level]} is now active.`
            : 'Open Account → Verification to see what is needed.',
        data: { level: record.level, status },
      });
      return { id, status, newLevel, auditSeq: audit.seq };
    });
  }

  async amlAlerts(query: AdminAmlQuery, now = new Date()) {
    const q = query.q?.replace(/^@/, '').toLowerCase();
    const where: Prisma.AmlAlertWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.riskLevel ? { riskLevel: query.riskLevel } : {}),
      ...(q ? { OR: [{ user: { handle: { contains: q } } }, { rule: { contains: q } }] } : {}),
    };
    const [rows, total, byStatus, byRisk, resolved7d] = await Promise.all([
      this.prisma.amlAlert.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          user: { select: { id: true, handle: true, publicId: true } },
          withdrawal: {
            select: {
              id: true,
              number: true,
              amount: true,
              network: true,
              toAddress: true,
              status: true,
            },
          },
          deposit: {
            select: { id: true, number: true, amount: true, network: true, status: true },
          },
        },
      }),
      this.prisma.amlAlert.count({ where }),
      this.prisma.amlAlert.groupBy({ by: ['status'], _count: true }),
      this.prisma.amlAlert.groupBy({
        by: ['riskLevel'],
        where: { status: { in: [...OPEN_AML] } },
        _count: true,
      }),
      this.prisma.amlAlert.count({
        where: { resolvedAt: { gte: addHours(now, -24 * 7) } },
      }),
    ]);
    const s = (k: string) => byStatus.find((b) => b.status === k)?._count ?? 0;
    const r = (k: string) => byRisk.find((b) => b.riskLevel === k)?._count ?? 0;
    return {
      summary: {
        open: s('open') + s('under_review') + s('escalated'),
        escalated: s('escalated'),
        highOrCritical: r('high') + r('critical'),
        byRisk: { low: r('low'), medium: r('medium'), high: r('high'), critical: r('critical') },
        resolved7d,
      },
      ...paginate(
        rows.map((a) => {
          const details = (a.details ?? {}) as Record<string, unknown>;
          return {
            id: a.id,
            reference: amlRef(a.id),
            riskLevel: a.riskLevel,
            score: riskScore(a.riskLevel),
            rule: a.rule,
            status: a.status,
            user: a.user
              ? { id: a.user.id, handle: atHandle(a.user.handle), publicId: a.user.publicId }
              : null,
            subject: a.withdrawal
              ? {
                  type: 'withdrawal' as const,
                  id: a.withdrawal.id,
                  reference: `WD-${a.withdrawal.number}`,
                  amount: usdt(a.withdrawal.amount),
                  network: a.withdrawal.network,
                  address: a.withdrawal.toAddress,
                  status: a.withdrawal.status,
                }
              : a.deposit
                ? {
                    type: 'deposit' as const,
                    id: a.deposit.id,
                    reference: `DP-${a.deposit.number}`,
                    amount: usdt(a.deposit.amount),
                    network: a.deposit.network,
                    address: null,
                    status: a.deposit.status,
                  }
                : null,
            reason: typeof details.reason === 'string' ? details.reason : null,
            decision: typeof details.decision === 'string' ? details.decision : null,
            provider: typeof details.provider === 'string' ? details.provider : null,
            checks: Array.isArray(details.checks)
              ? details.checks
              : typeof details.checks === 'number'
                ? details.checks
                : null,
            resolution: a.resolution,
            resolvedAt: a.resolvedAt?.toISOString() ?? null,
            createdAt: a.createdAt.toISOString(),
            ageHours: Math.floor((now.getTime() - a.createdAt.getTime()) / 3_600_000),
            isDemo: a.isDemo,
          };
        }),
        total,
        query,
      ),
      actions: {
        allowed: ['Resolve (cleared)', 'Dismiss (false positive)', 'Escalate to MLRO'],
        note: 'Alerts never move funds. A held withdrawal is decided in Finance → Withdrawals (four-eyes).',
      },
      generatedAt: now.toISOString(),
    };
  }
}
