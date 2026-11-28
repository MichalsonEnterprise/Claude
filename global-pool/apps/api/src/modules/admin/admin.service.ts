import { Injectable } from '@nestjs/common';
import type { Prisma, RestrictionType, WithdrawalStatus } from '@prisma/client';
import { RESTRICTION_REQUIRES_FOUR_EYES } from '@gp/shared/enums';
import { paginate, type AdminUsersQuery, type PaginationQuery } from '@gp/shared/schemas';

import { AppError, notFound } from '../../common/errors';
import { usdt } from '../../common/money';
import type { AuthAdmin, RequestMeta } from '../../common/request';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { maskEmail } from '../users/users.service';
import { WithdrawalsService } from '../withdrawals/withdrawals.service';
import { AdminSecurityService } from './admin-security.service';
import { approvalViewPermission, FourEyesService } from './four-eyes.service';

/**
 * Admin back-office. By design there is NO capability to edit round results, choose winners, move funds
 * arbitrarily, edit ledger rows or silently adjust balances — only reviewed, audited workflow actions.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly security: AdminSecurityService,
    private readonly withdrawals: WithdrawalsService,
    private readonly notifications: NotificationsService,
    private readonly fourEyes: FourEyesService,
  ) {}

  async listUsers(query: PaginationQuery & Partial<Omit<AdminUsersQuery, 'page' | 'pageSize'>>) {
    const and: Prisma.UserWhereInput[] = [];
    if (query.q) {
      and.push({
        OR: [
          { handle: { contains: query.q.toLowerCase().replace(/^@/, '') } },
          { publicId: { equals: query.q.toUpperCase() } },
          { email: { contains: query.q.toLowerCase() } },
        ],
      });
    }
    if (query.status) and.push({ status: query.status });
    if (query.kycLevel) {
      and.push(
        query.kycLevel === 'none'
          ? { OR: [{ profile: { is: null } }, { profile: { kycLevel: 'none' } }] }
          : { profile: { kycLevel: query.kycLevel } },
      );
    }
    if (query.restricted === 'yes') and.push({ restrictions: { some: { liftedAt: null } } });
    if (query.restricted === 'no') and.push({ restrictions: { none: { liftedAt: null } } });
    const where: Prisma.UserWhereInput = and.length > 0 ? { AND: and } : {};
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          profile: true,
          restrictions: { where: { liftedAt: null } },
          amlAlerts: {
            where: { status: { in: ['open', 'under_review', 'escalated'] } },
            select: { riskLevel: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    // Ledger-derived totals (read-only) for the page — one query per row, page size ≤ 100.
    const balances = await Promise.all(rows.map((u) => this.ledger.userBalances(u.id)));
    const RANK = { low: 1, medium: 2, high: 3, critical: 4 } as const;
    return paginate(
      rows.map((u, i) => ({
        id: u.id,
        publicId: u.publicId,
        handle: u.handle,
        emailMasked: maskEmail(u.email),
        country: u.profile?.country ?? null,
        kycLevel: u.profile?.kycLevel ?? 'none',
        vipTier: u.profile?.vipTier ?? 'bronze',
        status: u.status,
        onboarded: u.onboardedAt !== null,
        restrictions: u.restrictions.map((r) => r.type),
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        totalBalance: balances[i]?.total ?? '0.00',
        amlOpenAlerts: u.amlAlerts.length,
        amlRiskLevel:
          u.amlAlerts.reduce<keyof typeof RANK | null>(
            (acc, a) => (acc === null || RANK[a.riskLevel] > RANK[acc] ? a.riskLevel : acc),
            null,
          ) ?? null,
        isDemo: u.isDemo,
      })),
      total,
      query,
    );
  }

  async userDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        restrictions: { orderBy: { appliedAt: 'desc' } },
        kycRecords: { orderBy: { createdAt: 'desc' }, take: 5 },
        amlAlerts: { orderBy: { createdAt: 'desc' }, take: 10 },
        totpSecret: { select: { status: true } },
      },
    });
    if (!user) throw notFound('User');
    const [balances, transactions, sessions] = await Promise.all([
      this.ledger.userBalances(id),
      this.prisma.transaction.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.session.count({ where: { userId: id, revokedAt: null } }),
    ]);
    return {
      id: user.id,
      publicId: user.publicId,
      handle: user.handle,
      emailMasked: maskEmail(user.email),
      status: user.status,
      country: user.profile?.country ?? null,
      kycLevel: user.profile?.kycLevel ?? 'none',
      vip: { tier: user.profile?.vipTier ?? 'bronze', level: user.profile?.vipLevel ?? 1 },
      twoFactorEnabled: user.totpSecret?.status === 'active',
      onboardedAt: user.onboardedAt?.toISOString() ?? null,
      balances,
      activeSessions: sessions,
      restrictions: user.restrictions.map((r) => ({
        id: r.id,
        type: r.type,
        reason: r.reason,
        appliedAt: r.appliedAt.toISOString(),
        liftedAt: r.liftedAt?.toISOString() ?? null,
        liftReason: r.liftReason,
      })),
      kyc: user.kycRecords.map((k) => ({
        id: k.id,
        level: k.level,
        status: k.status,
        provider: k.provider,
        createdAt: k.createdAt.toISOString(),
      })),
      amlAlerts: user.amlAlerts.map((a) => ({
        id: a.id,
        riskLevel: a.riskLevel,
        rule: a.rule,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
      })),
      recentTransactions: transactions.map((t) => ({
        reference: t.reference,
        type: t.type,
        status: t.status,
        amount: usdt(t.amount),
        netAmount: usdt(t.netAmount),
        createdAt: t.createdAt.toISOString(),
      })),
      isDemo: user.isDemo,
    };
  }

  async applyRestriction(
    admin: AuthAdmin,
    userId: string,
    input: { type: RestrictionType; reason: string; mfaCode: string; reasonCategory?: string },
    meta: RequestMeta,
  ) {
    await this.security.assertSensitive(admin, 'users.restrict', input);
    if (RESTRICTION_REQUIRES_FOUR_EYES[input.type]) {
      // Withdrawal holds and account suspensions need a second admin (ADM-X1): store a request, change nothing yet.
      const target = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!target) throw notFound('User');
      const active = await this.prisma.userRestriction.findFirst({
        where: { userId, type: input.type, liftedAt: null },
      });
      if (active) throw new AppError('CONFLICT', `Restriction ${input.type} is already active`);
      return this.fourEyes.request(
        admin,
        {
          action: 'user.restriction.apply',
          targetType: 'user',
          targetId: userId,
          reason: input.reason,
          reasonCategory: input.reasonCategory,
          payload: {
            type: input.type,
            userHandle: target.handle,
            userPublicId: target.publicId,
          },
          dedupeKey: input.type,
        },
        meta,
      );
    }
    return this.prisma.tx(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw notFound('User');
      const existing = await tx.userRestriction.findFirst({
        where: { userId, type: input.type, liftedAt: null },
      });
      if (existing) throw new AppError('CONFLICT', `Restriction ${input.type} is already active`);
      const restriction = await tx.userRestriction.create({
        data: { userId, type: input.type, reason: input.reason, appliedByAdminId: admin.id },
      });
      await this.audit.record(
        {
          actorType: 'admin',
          actorId: admin.id,
          actorLabel: admin.name,
          action: 'user.restriction.applied',
          targetType: 'user',
          targetId: userId,
          reason: input.reason,
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
          metadata: {
            restrictionId: restriction.id,
            type: input.type,
            reasonCategory: input.reasonCategory ?? null,
            fourEyes: false,
          },
        },
        tx,
      );
      await this.notifications.notify(tx, {
        userId,
        type: 'account.restriction',
        title: 'Account restriction applied',
        body: 'Some actions on your account are restricted. Contact support for details.',
        data: { type: input.type },
      });
      return {
        status: 'active' as const,
        id: restriction.id,
        type: restriction.type,
        appliedAt: restriction.appliedAt.toISOString(),
      };
    });
  }

  async liftRestriction(
    admin: AuthAdmin,
    userId: string,
    restrictionId: string,
    input: { reason: string; mfaCode: string; reasonCategory?: string },
    meta: RequestMeta,
  ) {
    await this.security.assertSensitive(admin, 'users.restrict', input);
    return this.prisma.tx(async (tx) => {
      const r = await tx.userRestriction.findFirst({
        where: { id: restrictionId, userId, liftedAt: null },
      });
      if (!r) throw notFound('Active restriction');
      const lifted = await tx.userRestriction.update({
        where: { id: r.id },
        data: { liftedAt: new Date(), liftedByAdminId: admin.id, liftReason: input.reason },
      });
      await this.audit.record(
        {
          actorType: 'admin',
          actorId: admin.id,
          actorLabel: admin.name,
          action: 'user.restriction.lifted',
          targetType: 'user',
          targetId: userId,
          reason: input.reason,
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
          metadata: { restrictionId, type: r.type, reasonCategory: input.reasonCategory ?? null },
        },
        tx,
      );
      return { id: lifted.id, type: lifted.type, liftedAt: lifted.liftedAt!.toISOString() };
    });
  }

  async withdrawalQueue(query: PaginationQuery & { status?: WithdrawalStatus }) {
    const where: Prisma.WithdrawalWhereInput = {
      status: query.status ?? {
        in: ['under_review', 'queued', 'requested', 'risk_check', 'broadcast'],
      },
    };
    const [rows, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          user: { select: { publicId: true, handle: true } },
          events: { orderBy: { createdAt: 'asc' } },
        },
      }),
      this.prisma.withdrawal.count({ where }),
    ]);
    const approvals = await this.prisma.adminApproval.findMany({
      where: {
        targetType: 'withdrawal',
        targetId: { in: rows.map((r) => r.id) },
        status: 'pending',
      },
    });
    return paginate(
      rows.map((w) => ({
        ...this.withdrawals.view(w),
        user: { publicId: w.user.publicId, handle: w.user.handle },
        riskFlags: w.riskFlags,
        pendingApproval: approvals.find((a) => a.targetId === w.id)
          ? {
              approvals: 1,
              of: 2,
              requestedByAdminId: approvals.find((a) => a.targetId === w.id)!.requestedByAdminId,
            }
          : null,
      })),
      total,
      query,
    );
  }

  async approveWithdrawal(
    admin: AuthAdmin,
    id: string,
    input: { reason: string; mfaCode: string },
    meta: RequestMeta,
  ) {
    // Four-eyes pre-check before consuming an MFA code: the first approver can never give the second approval.
    const mine = await this.prisma.adminApproval.findFirst({
      where: {
        targetType: 'withdrawal',
        targetId: id,
        action: 'withdrawal.approve',
        status: 'pending',
        requestedByAdminId: admin.id,
      },
    });
    if (mine)
      throw new AppError(
        'FORBIDDEN',
        'Four-eyes rule: a different admin must give the second approval',
      );
    await this.security.assertSensitive(admin, 'withdrawals.approve', input);
    return this.withdrawals.adminApprove(admin, id, input.reason, meta);
  }

  async rejectWithdrawal(
    admin: AuthAdmin,
    id: string,
    input: { reason: string; mfaCode: string },
    meta: RequestMeta,
  ) {
    await this.security.assertSensitive(admin, 'withdrawals.reject', input);
    return this.withdrawals.adminReject(admin, id, input.reason, meta);
  }

  /**
   * Four-eyes requests of the modules this admin may read — the same per-request rule as the inbox and the detail
   * (withdrawals → withdrawals.read, restrictions → users.read, role changes → system.read, breaker →
   * rounds.read): reasons and payloads (player handles, restriction types) never reach other roles.
   */
  async approvals(
    admin: Pick<AuthAdmin, 'permissions'>,
    status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired' = 'pending',
  ) {
    const rows = await this.prisma.adminApproval.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { requestedBy: { select: { name: true } }, decidedBy: { select: { name: true } } },
    });
    const visible = rows.filter((a) => admin.permissions.includes(approvalViewPermission(a)));
    return visible.map((a) => ({
      id: a.id,
      action: a.action,
      targetType: a.targetType,
      targetId: a.targetId,
      status: a.status,
      requestedBy: a.requestedBy.name,
      requestReason: a.requestReason,
      decidedBy: a.decidedBy?.name ?? null,
      decisionReason: a.decisionReason,
      payload: a.payload,
      createdAt: a.createdAt.toISOString(),
      decidedAt: a.decidedAt?.toISOString() ?? null,
    }));
  }

  async auditLogs(
    query: PaginationQuery & {
      action?: string;
      actorId?: string;
      targetType?: string;
      targetId?: string;
    },
  ) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: { startsWith: query.action } } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
      ...(query.targetId ? { targetId: query.targetId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { seq: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginate(
      rows.map((r) => ({
        id: r.id,
        seq: r.seq.toString(),
        actorType: r.actorType,
        actorId: r.actorId,
        actorLabel: r.actorLabel,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        outcome: r.outcome,
        ip: r.ip,
        requestId: r.requestId,
        metadata: r.metadata,
        prevHash: r.prevHash,
        hash: r.hash,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      query,
    );
  }
}
